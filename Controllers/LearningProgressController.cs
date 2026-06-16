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
    public class LearningProgressController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public LearningProgressController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private IQueryable<LearningProgress> Query() =>
            _context.LearningProgresses.Include(lp => lp.User).Include(lp => lp.Lesson);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<LearningProgressDTO>>> GetAll()
        {
            var items = await Query().ToListAsync();
            return Ok(_mapper.Map<IEnumerable<LearningProgressDTO>>(items));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<LearningProgressDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(lp => lp.Id == id);
            if (item == null) return NotFound();
            return Ok(_mapper.Map<LearningProgressDTO>(item));
        }

        [HttpPost]
        public async Task<ActionResult<LearningProgressDTO>> Create([FromBody] LearningProgressDTO dto)
        {
            var entity = _mapper.Map<LearningProgress>(dto);
            _context.LearningProgresses.Add(entity);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, _mapper.Map<LearningProgressDTO>(entity));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] LearningProgressDTO dto)
        {
            var entity = await _context.LearningProgresses.FindAsync(id);
            if (entity == null) return NotFound();
            _mapper.Map(dto, entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.LearningProgresses.FindAsync(id);
            if (entity == null) return NotFound();
            _context.LearningProgresses.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
