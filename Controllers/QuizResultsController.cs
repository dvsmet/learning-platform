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
    public class QuizResultsController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public QuizResultsController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private IQueryable<QuizResult> Query() =>
            _context.QuizResults.Include(qr => qr.User).Include(qr => qr.Quiz);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuizResultDTO>>> GetAll()
        {
            var items = await Query().ToListAsync();
            return Ok(_mapper.Map<IEnumerable<QuizResultDTO>>(items));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<QuizResultDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(qr => qr.Id == id);
            if (item == null) return NotFound();
            return Ok(_mapper.Map<QuizResultDTO>(item));
        }

        [HttpPost]
        public async Task<ActionResult<QuizResultDTO>> Create([FromBody] QuizSubmitDTO dto)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidVals) ||
                !int.TryParse(uidVals.FirstOrDefault(), out var userId))
            {
                return Unauthorized();
            }

            var quiz = await _context.Quizzes
                .Include(q => q.Questions).ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == dto.QuizId);

            if (quiz == null)
                return NotFound(new { message = "Тест не найден" });

            int correctCount = 0;
            foreach (var answer in dto.Answers)
            {
                var question = quiz.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
                if (question == null) continue;

                var selectedOption = question.Options.FirstOrDefault(o => o.Id == answer.SelectedOptionId);
                if (selectedOption != null && selectedOption.IsCorrect)
                    correctCount++;
            }

            int totalQuestions = quiz.Questions.Count;
            int score = totalQuestions > 0
                ? (int)Math.Round((double)correctCount / totalQuestions * quiz.MaxScore)
                : 0;

            var entity = new QuizResult
            {
                UserId = userId,
                QuizId = dto.QuizId,
                Score = score,
                CompletionDate = DateTime.UtcNow
            };

            _context.QuizResults.Add(entity);
            await _context.SaveChangesAsync();

            var lessonId = quiz.LessonId;
            var progress = await _context.LearningProgresses
                .FirstOrDefaultAsync(lp => lp.UserId == userId && lp.LessonId == lessonId);
            if (progress != null)
            {
                progress.Status = "completed";
                progress.LastUpdated = DateTime.UtcNow;
            }
            else
            {
                _context.LearningProgresses.Add(new LearningProgress
                {
                    UserId = userId,
                    LessonId = lessonId,
                    Status = "completed",
                    LastUpdated = DateTime.UtcNow,
                });
            }
            await _context.SaveChangesAsync();

            var saved = await Query().FirstOrDefaultAsync(qr => qr.Id == entity.Id);
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, _mapper.Map<QuizResultDTO>(saved));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.QuizResults.FindAsync(id);
            if (entity == null) return NotFound();
            _context.QuizResults.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
