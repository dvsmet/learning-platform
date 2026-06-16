using Microsoft.EntityFrameworkCore;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Models;

namespace LearningPlatformAPI.Services
{
    // Сервис для управления доступом к курсам
    public class CourseAccessService
    {
        private readonly LearningPlatformContext _context;
        private readonly ILogger<CourseAccessService> _logger;

        public CourseAccessService(
            LearningPlatformContext context,
            ILogger<CourseAccessService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Предоставить доступ к курсам из заказа пользователю
        // orderId - ID заказа
        // returns - Количество созданных записей прогресса
        public async Task<int> GrantCourseAccessAsync(int orderId)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .Include(o => o.User)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                throw new ArgumentException($"Order with id {orderId} not found");
            }

            if (order.Status != "approved")
            {
                throw new InvalidOperationException($"Order {orderId} is not approved. Current status: {order.Status}");
            }

            var createdCount = 0;
            // Собираем уже существующие записи прогресса пользователя заранее, чтобы
            // избежать повторных вставок и ошибок уникальности при множественных позициях заказа.
            var existingLessonProgress = await _context.LearningProgresses
                .Where(lp => lp.UserId == order.UserId)
                .Select(lp => lp.LessonId)
                .ToHashSetAsync();
            var toCreateLessonIds = new HashSet<int>(); // Уроки, которые добавим в рамках текущего вызова

            foreach (var orderItem in order.OrderItems)
            {
                // Загружаем курс отдельно, чтобы убедиться, что он загружен
                var course = await _context.Courses
                    .Include(c => c.Lessons)
                    .FirstOrDefaultAsync(c => c.Id == orderItem.CourseId);

                if (course == null)
                {
                    _logger.LogWarning(
                        "Course {CourseId} from order item {OrderItemId} not found. Skipping.",
                        orderItem.CourseId,
                        orderItem.Id);
                    continue;
                }

                // Получаем все уроки курса
                var lessons = course.Lessons?.ToList() ?? new List<Lesson>();

                if (!lessons.Any())
                {
                    _logger.LogInformation(
                        "Course {CourseId} has no lessons. No learning progress records to create.",
                        course.Id);
                    continue;
                }

                foreach (var lesson in lessons)
                {
                    // Пропускаем, если прогресс уже существует или будет создан в этой операции
                    if (existingLessonProgress.Contains(lesson.Id) || toCreateLessonIds.Contains(lesson.Id))
                    {
                        continue;
                    }

                    try
                    {
                        // Создаем новую запись прогресса со статусом "not_started"
                        var progress = new LearningProgress
                        {
                            UserId = order.UserId,
                            LessonId = lesson.Id,
                            Status = "started",
                            LastUpdated = DateTime.UtcNow
                        };

                        _context.LearningProgresses.Add(progress);
                        toCreateLessonIds.Add(lesson.Id);
                        createdCount++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(
                            ex,
                            "Error creating learning progress for user {UserId}, lesson {LessonId}",
                            order.UserId,
                            lesson.Id);
                        throw;
                    }
                }
            }

            if (createdCount > 0)
            {
                try
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation(
                        "Granted access to courses for order {OrderId}. Created {Count} learning progress records for user {UserId}",
                        orderId,
                        createdCount,
                        order.UserId);
                }
                catch (Exception ex)
                {
                    var inner = ex.InnerException?.Message ?? "no inner exception";
                    _logger.LogError(
                        ex,
                        "Error saving learning progress records for order {OrderId}. Inner exception: {InnerException}",
                        orderId,
                        inner);

                    throw new InvalidOperationException(
                        $"Error saving learning progress records for order {orderId}",
                        ex);
                }
            }
            else
            {
                _logger.LogInformation(
                    "No new learning progress records needed for order {OrderId}. User {UserId} may already have access.",
                    orderId,
                    order.UserId);
            }

            return createdCount;
        }

        // Проверить, имеет ли пользователь доступ к курсу
        public async Task<bool> HasAccessToCourseAsync(int userId, int courseId)
        {
            var hasApprovedOrder = await _context.Orders
                .Where(o => o.UserId == userId && o.Status == "approved")
                .SelectMany(o => o.OrderItems)
                .AnyAsync(oi => oi.CourseId == courseId);

            return hasApprovedOrder;
        }
    }
}

