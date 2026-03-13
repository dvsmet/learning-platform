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
    public class OrderItemsController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;

        public OrderItemsController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        private IQueryable<OrderItem> Query() =>
            _context.OrderItems.Include(oi => oi.Order).Include(oi => oi.Course);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderItemDTO>>> GetAll()
        {
            var items = await Query().ToListAsync();
            return Ok(_mapper.Map<IEnumerable<OrderItemDTO>>(items));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrderItemDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(oi => oi.Id == id);
            if (item == null) return NotFound();
            return Ok(_mapper.Map<OrderItemDTO>(item));
        }

        [HttpPost]
        public async Task<ActionResult<OrderItemDTO>> Create([FromBody] OrderItemDTO dto)
        {
            var entity = _mapper.Map<OrderItem>(dto);
            _context.OrderItems.Add(entity);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, _mapper.Map<OrderItemDTO>(entity));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] OrderItemDTO dto)
        {
            var entity = await _context.OrderItems.FindAsync(id);
            if (entity == null) return NotFound();
            _mapper.Map(dto, entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.OrderItems.FindAsync(id);
            if (entity == null) return NotFound();
            _context.OrderItems.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
