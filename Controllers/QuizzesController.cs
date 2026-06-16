using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Models;
using LearningPlatformAPI.DTOs;
using AutoMapper;

namespace LearningPlatformAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuizzesController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public QuizzesController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private IQueryable<Quiz> Query() =>
            _context.Quizzes
                .Include(q => q.Lesson)
                    .ThenInclude(l => l.Course)
                .Include(q => q.QuizResults)
                .Include(q => q.Questions)
                    .ThenInclude(qn => qn.Options);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuizDTO>>> GetAll()
        {
            var isPrivileged = await IsAdminOrInstructor();

            List<Quiz> items;
            if (isPrivileged.isInstructor && !isPrivileged.isAdmin)
            {
                items = await Query()
                    .Where(q => q.Lesson != null && q.Lesson.Course != null && q.Lesson.Course.InstructorId == isPrivileged.userId)
                    .ToListAsync();
            }
            else
            {
                items = await Query().ToListAsync();
            }

            var dtos = _mapper.Map<List<QuizDTO>>(items);

            if (!isPrivileged.isAdmin && !isPrivileged.isInstructor)
                StripCorrectAnswers(dtos);

            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<QuizDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(q => q.Id == id);
            if (item == null) return NotFound();

            var isPrivileged = await IsAdminOrInstructor();

            if (isPrivileged.isInstructor && !isPrivileged.isAdmin)
            {
                if (item.Lesson?.Course?.InstructorId != isPrivileged.userId)
                    return Unauthorized();
            }

            var dto = _mapper.Map<QuizDTO>(item);

            if (!isPrivileged.isAdmin && !isPrivileged.isInstructor)
                StripCorrectAnswers(new List<QuizDTO> { dto });

            return Ok(dto);
        }

        private async Task<(int userId, bool isAdmin, bool isInstructor)> IsAdminOrInstructor()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) &&
                int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user != null)
                    return (uid, user.IsAdmin, user.IsInstructor);
            }
            return (0, false, false);
        }

        private static void StripCorrectAnswers(List<QuizDTO> dtos)
        {
            foreach (var quiz in dtos)
                foreach (var q in quiz.Questions ?? new List<QuizQuestionDTO>())
                    foreach (var o in q.Options ?? new List<QuizOptionDTO>())
                        o.IsCorrect = false;
        }

        [HttpPost]
        public async Task<ActionResult<QuizDTO>> Create([FromBody] QuizDTO dto)
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var requestUser = await _context.Users.FindAsync(uid);
                if (requestUser == null) return Unauthorized();

                if (!requestUser.IsAdmin)
                {
                    var lesson = await _context.Lessons.FindAsync(dto.LessonId);
                    if (lesson == null) return BadRequest(new { message = "Урок не найден" });
                    var course = await _context.Courses.FindAsync(lesson.CourseId);
                    if (course == null) return BadRequest(new { message = "Курс не найден" });
                    if (course.InstructorId != uid) return Unauthorized();
                }
            }

            if (await _context.Quizzes.AnyAsync(q => q.LessonId == dto.LessonId))
            {
                return Conflict(new { message = $"Тест для урока {dto.LessonId} уже существует. Удалите/обновите существующий тест или выберите другой урок." });
            }

            var entity = _mapper.Map<Quiz>(dto);

            _context.Quizzes.Add(entity);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Ошибка сохранения теста в БД" });
            }

            var saved = await Query().FirstOrDefaultAsync(q => q.Id == entity.Id);
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, _mapper.Map<QuizDTO>(saved));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] QuizDTO dto)
        {
            var existing = await _context.Quizzes
                .Include(q => q.Questions).ThenInclude(qn => qn.Options)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (existing == null) return NotFound();

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var requestUser = await _context.Users.FindAsync(uid);
                if (requestUser == null) return Unauthorized();

                if (!requestUser.IsAdmin)
                {
                    var lessonToCheckId = dto.LessonId != 0 ? dto.LessonId : existing.LessonId;
                    var lesson = await _context.Lessons.FindAsync(lessonToCheckId);
                    if (lesson == null) return BadRequest(new { message = "Урок не найден" });
                    var course = await _context.Courses.FindAsync(lesson.CourseId);
                    if (course == null) return BadRequest(new { message = "Курс не найден" });
                    if (course.InstructorId != uid) return Unauthorized();
                }
            }

            if (existing.LessonId != dto.LessonId)
            {
                var conflict = await _context.Quizzes.AnyAsync(q => q.LessonId == dto.LessonId && q.Id != id);
                if (conflict)
                {
                    return Conflict(new { message = $"Невозможно привязать тест к уроку {dto.LessonId}: уже существует другой тест для этого урока." });
                }
            }

            existing.Title = dto.Title;
            existing.MaxScore = dto.MaxScore;
            existing.LessonId = dto.LessonId;

            if (dto.Questions != null)
            {
                _context.QuizOptions.RemoveRange(existing.Questions.SelectMany(q => q.Options));
                _context.QuizQuestions.RemoveRange(existing.Questions);

                var newQuestions = _mapper.Map<List<QuizQuestion>>(dto.Questions);
                foreach (var q in newQuestions) q.QuizId = existing.Id;
                existing.Questions = newQuestions;
                _context.QuizQuestions.AddRange(newQuestions);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Ошибка при сохранении изменений теста в БД" });
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Quizzes.FindAsync(id);
            if (entity == null) return NotFound();

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var requestUser = await _context.Users.FindAsync(uid);
                if (requestUser == null) return Unauthorized();

                if (!requestUser.IsAdmin)
                {
                    var lesson = await _context.Lessons.FindAsync(entity.LessonId);
                    if (lesson == null) return BadRequest(new { message = "Урок не найден" });
                    var course = await _context.Courses.FindAsync(lesson.CourseId);
                    if (course == null) return BadRequest(new { message = "Курс не найден" });
                    if (course.InstructorId != uid) return Unauthorized();
                }
            }

            _context.Quizzes.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
