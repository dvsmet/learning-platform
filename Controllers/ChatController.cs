using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Models;
using LearningPlatformAPI.DTOs;
using AutoMapper;

namespace LearningPlatformAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public ChatController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private async Task<(int? userId, bool isAdmin, bool isInstructor)> GetCurrentUser()
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var vals) ||
                !int.TryParse(vals.FirstOrDefault(), out var uid))
                return (null, false, false);

            var user = await _context.Users.FindAsync(uid);
            return user == null ? (null, false, false) : (uid, user.IsAdmin, user.IsInstructor);
        }

        private Task<bool> IsApprovedLearnerOnCourse(int learnerUserId, int courseId) =>
            _context.Orders.AnyAsync(o => o.UserId == learnerUserId && o.Status == "approved" &&
                o.OrderItems.Any(oi => oi.CourseId == courseId));

        /// <summary>Инструктор курса или админ может вести переписку с записанным на курс обучающимся.</summary>
        private async Task<bool> CanStaffAccessLearnerThread(int? staffId, bool isAdmin, int learnerUserId, int courseId)
        {
            if (staffId == null) return false;
            if (!await IsApprovedLearnerOnCourse(learnerUserId, courseId)) return false;
            if (isAdmin) return true;
            var course = await _context.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courseId);
            return course != null && course.InstructorId == staffId;
        }

        /// <summary>
        /// Список чат-потоков. Для пользователя — курсы с одобренным доступом.
        /// Для инструктора — сотрудники на его курсах.
        /// </summary>
        [HttpGet("threads")]
        public async Task<ActionResult<IEnumerable<ChatThreadDTO>>> GetThreads()
        {
            var (uid, isAdmin, isInstructor) = await GetCurrentUser();
            if (uid == null) return Unauthorized();

            var hiddenForReader = await _context.ChatMessageHiddens.AsNoTracking()
                .Where(h => h.UserId == uid)
                .Select(h => h.MessageId)
                .ToHashSetAsync();

            var threads = new List<ChatThreadDTO>();

            if (isInstructor || isAdmin)
            {
                var coursesQuery = _context.Courses.Include(c => c.Instructor).AsQueryable();
                if (!isAdmin)
                    coursesQuery = coursesQuery.Where(c => c.InstructorId == uid);

                var courses = await coursesQuery.ToListAsync();
                var approvedPairs = await _context.Orders
                    .Where(o => o.Status == "approved")
                    .SelectMany(o => o.OrderItems.Select(oi => new { o.UserId, oi.CourseId }))
                    .Distinct()
                    .ToListAsync();

                var userIds = approvedPairs.Select(p => p.UserId).Distinct().ToList();
                var users = await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);

                var readMap = await _context.Set<ChatThreadRead>()
                    .Where(r => r.ReaderId == uid)
                    .ToDictionaryAsync(r => (r.UserId, r.CourseId), r => r.LastReadAt);

                foreach (var c in courses)
                {
                    var learners = approvedPairs.Where(p => p.CourseId == c.Id).Select(p => p.UserId).Distinct().ToList();
                    foreach (var learnerId in learners)
                    {
                        if (!users.TryGetValue(learnerId, out var learner)) continue;
                        var last = await _context.ChatMessages
                            .Where(m => m.UserId == learnerId && m.CourseId == c.Id && !hiddenForReader.Contains(m.Id))
                            .OrderByDescending(m => m.SentAt)
                            .FirstOrDefaultAsync();
                        var hasUnread = last != null && last.SenderId != uid &&
                            (!readMap.TryGetValue((learnerId, c.Id), out var lastRead) || last.SentAt > lastRead);
                        threads.Add(new ChatThreadDTO
                        {
                            UserId = learnerId,
                            UserName = learner.Name,
                            CourseId = c.Id,
                            CourseTitle = c.Title,
                            InstructorId = c.InstructorId,
                            InstructorName = c.Instructor?.Name,
                            LastMessageAt = last?.SentAt,
                            LastMessagePreview = last != null ? (last.Text.Length > 50 ? last.Text[..50] + "…" : last.Text) : null,
                            HasUnread = hasUnread,
                        });
                    }
                }
            }
            else
            {
                var approvedCourseIds = await _context.Orders
                    .Where(o => o.UserId == uid && o.Status == "approved")
                    .SelectMany(o => o.OrderItems.Select(oi => oi.CourseId))
                    .Distinct()
                    .ToListAsync();

                var courses = await _context.Courses
                    .Include(c => c.Instructor)
                    .Where(c => approvedCourseIds.Contains(c.Id))
                    .ToListAsync();

                var readMap = await _context.Set<ChatThreadRead>()
                    .Where(r => r.ReaderId == uid)
                    .ToDictionaryAsync(r => (r.UserId, r.CourseId), r => r.LastReadAt);

                foreach (var c in courses)
                {
                    var last = await _context.ChatMessages
                        .Where(m => m.UserId == uid && m.CourseId == c.Id && !hiddenForReader.Contains(m.Id))
                        .OrderByDescending(m => m.SentAt)
                        .FirstOrDefaultAsync();
                    var hasUnread = last != null && last.SenderId != uid &&
                        (!readMap.TryGetValue(((int)uid, c.Id), out var lastRead) || last.SentAt > lastRead);
                    threads.Add(new ChatThreadDTO
                    {
                        UserId = (int)uid,
                        UserName = null,
                        CourseId = c.Id,
                        CourseTitle = c.Title,
                        InstructorId = c.InstructorId,
                        InstructorName = c.Instructor?.Name,
                        LastMessageAt = last?.SentAt,
                        LastMessagePreview = last != null ? (last.Text.Length > 50 ? last.Text[..50] + "…" : last.Text) : null,
                        HasUnread = hasUnread,
                    });
                }
            }

            return Ok(threads.OrderByDescending(t => t.LastMessageAt ?? DateTime.MinValue));
        }

        /// <summary>
        /// Сообщения потока (userId — сотрудник, courseId — курс).
        /// </summary>
        [HttpGet("messages")]
        public async Task<ActionResult<IEnumerable<ChatMessageDTO>>> GetMessages([FromQuery] int userId, [FromQuery] int courseId)
        {
            var (uid, isAdmin, isInstructor) = await GetCurrentUser();
            if (uid == null) return Unauthorized();

            var course = await _context.Courses.FindAsync(courseId);
            if (course == null) return NotFound(new { message = "Курс не найден" });

            var hasAccess = false;
            if (uid == userId)
            {
                hasAccess = await _context.Orders
                    .AnyAsync(o => o.UserId == userId && o.Status == "approved" &&
                        o.OrderItems.Any(oi => oi.CourseId == courseId));
            }
            else
            {
                hasAccess = await CanStaffAccessLearnerThread(uid, isAdmin, userId, courseId);
            }

            if (!hasAccess) return Forbid();

            var hiddenIds = await _context.ChatMessageHiddens
                .Where(h => h.UserId == uid)
                .Select(h => h.MessageId)
                .ToListAsync();

            var messages = await _context.ChatMessages
                .Include(m => m.Sender)
                .Where(m => m.UserId == userId && m.CourseId == courseId && !hiddenIds.Contains(m.Id))
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            var dtos = messages.Select(m => new ChatMessageDTO
            {
                Id = m.Id,
                UserId = m.UserId,
                CourseId = m.CourseId,
                SenderId = m.SenderId,
                Text = m.Text,
                SentAt = m.SentAt,
                SenderName = m.Sender?.Name,
                IsFromMe = m.SenderId == uid,
            }).ToList();

            return Ok(dtos);
        }

        /// <summary>
        /// Отметить поток как прочитанный.
        /// </summary>
        [HttpPost("mark-read")]
        public async Task<IActionResult> MarkRead([FromQuery] int userId, [FromQuery] int courseId)
        {
            var (uid, isAdmin, isInstructor) = await GetCurrentUser();
            if (uid == null) return Unauthorized();

            var course = await _context.Courses.FindAsync(courseId);
            if (course == null) return NotFound(new { message = "Курс не найден" });

            var hasAccess = false;
            if (uid == userId)
            {
                hasAccess = await _context.Orders
                    .AnyAsync(o => o.UserId == userId && o.Status == "approved" &&
                        o.OrderItems.Any(oi => oi.CourseId == courseId));
            }
            else
            {
                hasAccess = await CanStaffAccessLearnerThread(uid, isAdmin, userId, courseId);
            }

            if (!hasAccess) return Forbid();

            var now = DateTime.UtcNow;
            var existing = await _context.Set<ChatThreadRead>()
                .FirstOrDefaultAsync(r => r.ReaderId == uid && r.UserId == userId && r.CourseId == courseId);
            if (existing != null)
            {
                existing.LastReadAt = now;
            }
            else
            {
                _context.Set<ChatThreadRead>().Add(new ChatThreadRead
                {
                    ReaderId = (int)uid,
                    UserId = userId,
                    CourseId = courseId,
                    LastReadAt = now,
                });
            }
            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// Отправить сообщение.
        /// </summary>
        [HttpPost("messages")]
        public async Task<ActionResult<ChatMessageDTO>> SendMessage([FromBody] SendMessageRequest req)
        {
            var (uid, isAdmin, isInstructor) = await GetCurrentUser();
            if (uid == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(req.Text))
                return BadRequest(new { message = "Текст сообщения не может быть пустым" });

            var course = await _context.Courses.FindAsync(req.CourseId);
            if (course == null) return NotFound(new { message = "Курс не найден" });

            var hasAccess = false;
            if (uid == req.UserId)
            {
                hasAccess = await _context.Orders
                    .AnyAsync(o => o.UserId == req.UserId && o.Status == "approved" &&
                        o.OrderItems.Any(oi => oi.CourseId == req.CourseId));
            }
            else
            {
                hasAccess = await CanStaffAccessLearnerThread(uid, isAdmin, req.UserId, req.CourseId);
            }

            if (!hasAccess) return Forbid();

            var msg = new ChatMessage
            {
                UserId = req.UserId,
                CourseId = req.CourseId,
                SenderId = (int)uid,
                Text = req.Text.Trim(),
                SentAt = DateTime.UtcNow,
            };
            _context.ChatMessages.Add(msg);
            await _context.SaveChangesAsync();

            var saved = await _context.ChatMessages.Include(m => m.Sender).FirstAsync(m => m.Id == msg.Id);
            return Ok(new ChatMessageDTO
            {
                Id = saved.Id,
                UserId = saved.UserId,
                CourseId = saved.CourseId,
                SenderId = saved.SenderId,
                Text = saved.Text,
                SentAt = saved.SentAt,
                SenderName = saved.Sender?.Name,
                IsFromMe = true,
            });
        }

        /// <summary>
        /// Редактировать своё сообщение.
        /// </summary>
        [HttpPut("messages/{id}")]
        public async Task<ActionResult<ChatMessageDTO>> UpdateMessage(int id, [FromBody] UpdateMessageRequest req)
        {
            var (uid, isAdmin, _) = await GetCurrentUser();
            if (uid == null) return Unauthorized();

            var msg = await _context.ChatMessages.Include(m => m.Sender).FirstOrDefaultAsync(m => m.Id == id);
            if (msg == null) return NotFound(new { message = "Сообщение не найдено" });
            if (msg.SenderId != uid) return Forbid();

            var course = await _context.Courses.FindAsync(msg.CourseId);
            if (course == null) return NotFound();

            var hasAccess = msg.UserId == uid || await CanStaffAccessLearnerThread(uid, isAdmin, msg.UserId, msg.CourseId);
            if (!hasAccess) return Forbid();

            if (string.IsNullOrWhiteSpace(req.Text))
                return BadRequest(new { message = "Текст не может быть пустым" });

            msg.Text = req.Text.Trim();
            await _context.SaveChangesAsync();

            return Ok(new ChatMessageDTO
            {
                Id = msg.Id,
                UserId = msg.UserId,
                CourseId = msg.CourseId,
                SenderId = msg.SenderId,
                Text = msg.Text,
                SentAt = msg.SentAt,
                SenderName = msg.Sender?.Name,
                IsFromMe = true,
            });
        }

        /// <summary>
        /// Удалить сообщение: forSelf=true — только у себя, forSelf=false — у обоих.
        /// </summary>
        [HttpDelete("messages/{id}")]
        public async Task<IActionResult> DeleteMessage(int id, [FromQuery] bool forSelf = false)
        {
            var (uid, isAdmin, _) = await GetCurrentUser();
            if (uid == null) return Unauthorized();

            var msg = await _context.ChatMessages.FindAsync(id);
            if (msg == null) return NotFound(new { message = "Сообщение не найдено" });

            var course = await _context.Courses.FindAsync(msg.CourseId);
            if (course == null) return NotFound();
            var hasAccess = msg.UserId == uid || await CanStaffAccessLearnerThread(uid, isAdmin, msg.UserId, msg.CourseId);
            if (!hasAccess) return Forbid();

            // «Удалить у обоих» — только автор сообщения
            if (!forSelf && msg.SenderId != uid) return Forbid();

            if (forSelf)
            {
                if (await _context.ChatMessageHiddens.AnyAsync(h => h.MessageId == id && h.UserId == uid))
                    return NoContent();
                _context.ChatMessageHiddens.Add(new ChatMessageHidden { MessageId = id, UserId = (int)uid });
            }
            else
            {
                _context.ChatMessages.Remove(msg);
            }
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class SendMessageRequest
    {
        public int UserId { get; set; }
        public int CourseId { get; set; }
        public string Text { get; set; } = string.Empty;
    }

    public class UpdateMessageRequest
    {
        public string Text { get; set; } = string.Empty;
    }
}
