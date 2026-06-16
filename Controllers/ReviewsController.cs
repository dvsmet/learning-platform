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
    public class ReviewsController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public ReviewsController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private IQueryable<Review> Query() =>
            _context.Reviews.Include(r => r.User).Include(r => r.Course);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReviewDTO>>> GetAll()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user != null && user.IsInstructor && !user.IsAdmin)
                {
                    var items = await Query().Where(r => r.Course != null && r.Course.InstructorId == uid).ToListAsync();
                    return Ok(_mapper.Map<IEnumerable<ReviewDTO>>(items));
                }
            }

            var itemsAll = await Query().ToListAsync();
            return Ok(_mapper.Map<IEnumerable<ReviewDTO>>(itemsAll));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ReviewDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(r => r.Id == id);
            if (item == null) return NotFound();

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) && int.TryParse(uidVals.FirstOrDefault(), out var uid))
            {
                var user = await _context.Users.FindAsync(uid);
                if (user != null && user.IsInstructor && !user.IsAdmin
                    && (item.Course == null || item.Course.InstructorId != uid))
                    return Unauthorized();
            }

            return Ok(_mapper.Map<ReviewDTO>(item));
        }

        [HttpPost]
        public async Task<ActionResult<ReviewDTO>> Create([FromBody] ReviewDTO dto)
        {
            var entity = _mapper.Map<Review>(dto);
            entity.ReviewDate = DateTime.UtcNow;

            _context.Reviews.Add(entity);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, _mapper.Map<ReviewDTO>(entity));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ReviewDTO dto)
        {
            var entity = await _context.Reviews.FindAsync(id);
            if (entity == null) return NotFound();
            _mapper.Map(dto, entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidVals) || !int.TryParse(uidVals.FirstOrDefault(), out var requesterId))
                return Unauthorized();
            var requester = await _context.Users.FindAsync(requesterId);
            if (requester == null || !requester.IsAdmin) return Unauthorized();

            var entity = await _context.Reviews.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Reviews.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
