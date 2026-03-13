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
    public class CoursesController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public CoursesController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private IQueryable<Course> Query() =>
            _context.Courses
                .Include(c => c.Instructor)
                .Include(c => c.CourseCategory)
                .Include(c => c.Lessons)
                .Include(c => c.Reviews);

        private CourseDTO ToDto(Course c)
        {
            var dto = _mapper.Map<CourseDTO>(c);
            dto.CategoryIds = c.CourseCategory?.Select(cc => cc.CategoryId).ToList() ?? new List<int>();
            return dto;
        }

        private List<CourseDTO> ToDtoList(IEnumerable<Course> items) =>
            items.Select(ToDto).ToList();

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CourseDTO>>> GetAll()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user != null && user.IsInstructor && !user.IsAdmin)
                {
                    var mine = await Query().Where(c => c.InstructorId == uid).ToListAsync();
                    return Ok(ToDtoList(mine));
                }
            }

            var items = await Query().ToListAsync();
            return Ok(ToDtoList(items));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CourseDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(c => c.Id == id);
            if (item == null) return NotFound();

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user != null && user.IsInstructor && !user.IsAdmin && item.InstructorId != uid)
                    return Unauthorized();
            }

            return Ok(ToDto(item));
        }

        [HttpPost]
        public async Task<ActionResult<CourseDTO>> Create([FromBody] CourseDTO dto)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidVals) || !int.TryParse(uidVals.FirstOrDefault(), out var uid))
                return Unauthorized();

            var user = await _context.Users.FindAsync(uid);
            if (user == null) return Unauthorized();

            if (user.IsAdmin)
            {
                // Админ может создать курс за любого инструктора
            }
            else if (user.IsInstructor)
            {
                // Инструктор может создать курс только за себя
                dto.InstructorId = uid;
            }
            else
            {
                return Unauthorized();
            }

            var entity = _mapper.Map<Course>(dto);
            _context.Courses.Add(entity);
            await _context.SaveChangesAsync();

            if (dto.CategoryIds is { Count: > 0 })
            {
                foreach (var catId in dto.CategoryIds)
                    _context.Set<CourseCategory>().Add(new CourseCategory { CourseId = entity.Id, CategoryId = catId });
                await _context.SaveChangesAsync();
            }

            var saved = await Query().FirstOrDefaultAsync(c => c.Id == entity.Id);
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ToDto(saved!));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CourseDTO dto)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidValsU) || !int.TryParse(uidValsU.FirstOrDefault(), out var uidU))
                return Unauthorized();

            var user = await _context.Users.FindAsync(uidU);
            if (user == null) return Unauthorized();

            var entity = await _context.Courses.Include(c => c.CourseCategory).FirstOrDefaultAsync(c => c.Id == id);
            if (entity == null) return NotFound();

            if (!user.IsAdmin && (user.IsInstructor && entity.InstructorId != uidU))
                return Unauthorized();
            if (!user.IsAdmin && !user.IsInstructor)
                return Unauthorized();

            if (user.IsInstructor && !user.IsAdmin)
                dto.InstructorId = uidU;

            _mapper.Map(dto, entity);

            if (dto.CategoryIds != null)
            {
                entity.CourseCategory.Clear();
                foreach (var catId in dto.CategoryIds)
                    entity.CourseCategory.Add(new CourseCategory { CourseId = id, CategoryId = catId });
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidValsD) || !int.TryParse(uidValsD.FirstOrDefault(), out var uidD))
                return Unauthorized();

            var user = await _context.Users.FindAsync(uidD);
            if (user == null) return Unauthorized();

            var entity = await _context.Courses.FindAsync(id);
            if (entity == null) return NotFound();

            if (!user.IsAdmin && (user.IsInstructor && entity.InstructorId != uidD))
                return Unauthorized();
            if (!user.IsAdmin && !user.IsInstructor)
                return Unauthorized();

            _context.Courses.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
