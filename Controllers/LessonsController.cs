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
    public class LessonsController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public LessonsController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private IQueryable<Lesson> Query() =>
            _context.Lessons.Include(l => l.Course)
                            .Include(l => l.Quizzes)
                            .Include(l => l.LearningProgresses);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<LessonDTO>>> GetAll()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user != null && user.IsInstructor && !user.IsAdmin)
                {
                    var items = await Query()
                        .Where(l => l.Course != null && l.Course.InstructorId == uid)
                        .ToListAsync();
                    return Ok(_mapper.Map<IEnumerable<LessonDTO>>(items));
                }
            }

            var all = await Query().ToListAsync();
            return Ok(_mapper.Map<IEnumerable<LessonDTO>>(all));
        }
 
        [HttpGet("{id}")]
        public async Task<ActionResult<LessonDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(l => l.Id == id);
            if (item == null) return NotFound();

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user != null && user.IsInstructor && !user.IsAdmin
                    && (item.Course == null || item.Course.InstructorId != uid))
                    return Unauthorized();
            }

            return Ok(_mapper.Map<LessonDTO>(item));
        }
 
        [HttpPost]
        public async Task<ActionResult<LessonDTO>> Create([FromBody] LessonDTO dto)
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user == null) return Unauthorized();
                var course = await _context.Courses.FindAsync(dto.CourseId);
                if (course == null) return BadRequest(new { message = "Курс не найден" });
                if (!user.IsAdmin && course.InstructorId != uid) return Unauthorized();
            }
 
            var entity = _mapper.Map<Lesson>(dto);
            _context.Lessons.Add(entity);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, _mapper.Map<LessonDTO>(entity));
        }
 
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] LessonDTO dto)
        {
            var entity = await _context.Lessons.FindAsync(id);
            if (entity == null) return NotFound();
            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user == null) return Unauthorized();
                var course = await _context.Courses.FindAsync(dto.CourseId);
                if (course == null) return BadRequest(new { message = "Курс не найден" });
                if (!user.IsAdmin && course.InstructorId != uid) return Unauthorized();
            }
 
            _mapper.Map(dto, entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
 
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Lessons.FindAsync(id);
            if (entity == null) return NotFound();

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user == null) return Unauthorized();
                var course = await _context.Courses.FindAsync(entity.CourseId);
                if (course == null) return BadRequest(new { message = "Курс не найден" });
                if (!user.IsAdmin && course.InstructorId != uid) return Unauthorized();
            }
 
            _context.Lessons.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
