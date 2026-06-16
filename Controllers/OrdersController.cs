using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Models;
using LearningPlatformAPI.DTOs;
using LearningPlatformAPI.Services;
using AutoMapper;

namespace LearningPlatformAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;
        private readonly CourseAccessService _courseAccessService;
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(
            LearningPlatformContext context,
            IMapper mapper,
            CourseAccessService courseAccessService,
            ILogger<OrdersController> logger)
        {
            _context = context;
            _mapper = mapper;
            _courseAccessService = courseAccessService;
            _logger = logger;
        }

        private IQueryable<Order> Query() =>
            _context.Orders.Include(o => o.User)
                           .Include(o => o.OrderItems).ThenInclude(oi => oi.Course).ThenInclude(c => c.Instructor);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderDTO>>> GetAll()
        {
            var items = await Query().ToListAsync();
            var dtos = _mapper.Map<IEnumerable<OrderDTO>>(items).ToList();

            foreach (var dto in dtos)
            {
                dto.TotalAmount = dto.OrderItems?.Sum(oi => oi.PriceAtPurchase) ?? 0m;
            }

            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrderDTO>> GetById(int id)
        {
            var item = await Query().FirstOrDefaultAsync(o => o.Id == id);
            if (item == null) return NotFound();
            return Ok(_mapper.Map<OrderDTO>(item));
        }

        [HttpPost]
        public async Task<ActionResult<OrderDTO>> Create([FromBody] OrderDTO dto)
        {
            var entity = _mapper.Map<Order>(dto);
            _context.Orders.Add(entity);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, _mapper.Map<OrderDTO>(entity));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] OrderDTO dto)
        {
            var entity = await _context.Orders.FindAsync(id);
            if (entity == null) return NotFound();
            _mapper.Map(dto, entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == id);
            if (entity == null) return NotFound();

            var courseIds = entity.OrderItems.Select(oi => oi.CourseId).ToList();
            var chatToRemove = await _context.ChatMessages
                .Where(m => m.UserId == entity.UserId && courseIds.Contains(m.CourseId))
                .ToListAsync();
            _context.ChatMessages.RemoveRange(chatToRemove);

            _context.Orders.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<OrderDTO>>> GetByUser(int userId)
        {
            var items = await _context.Orders
                .Where(o => o.UserId == userId)
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Course)
                .Include(o => o.User)
                .ToListAsync();

            var dtos = _mapper.Map<IEnumerable<OrderDTO>>(items).ToList();
            foreach (var dto in dtos)
            {
                dto.TotalAmount = dto.OrderItems?.Sum(oi => oi.PriceAtPurchase) ?? 0m;
            }

            return Ok(dtos);
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> Approve(int id)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidVals) ||
                !int.TryParse(uidVals.FirstOrDefault(), out var userId))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Course)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound(new { message = $"Заявка {id} не найдена" });

            if (order.Status == "approved")
                return BadRequest(new { message = "Заявка уже одобрена" });

            if (!user.IsAdmin)
            {
                var courseIds = order.OrderItems.Select(oi => oi.CourseId).ToList();
                var isInstructorOfCourses = await _context.Courses
                    .AnyAsync(c => courseIds.Contains(c.Id) && c.InstructorId == userId);

                if (!user.IsInstructor || !isInstructorOfCourses)
                    return Unauthorized();
            }

            order.Status = "approved";
            await _context.SaveChangesAsync();

            try
            {
                var createdCount = await _courseAccessService.GrantCourseAccessAsync(id);
                _logger.LogInformation(
                    "Order {OrderId} approved by user {UserId}. Created {Count} learning progress records.",
                    id, userId, createdCount);

                return Ok(new
                {
                    message = "Заявка одобрена, доступ к курсам предоставлен",
                    orderId = id,
                    learningProgressRecordsCreated = createdCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error granting course access for order {OrderId}", id);
                return StatusCode(500, new
                {
                    message = "Заявка одобрена, но произошла ошибка при предоставлении доступа"
                });
            }
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> Reject(int id)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidVals) ||
                !int.TryParse(uidVals.FirstOrDefault(), out var userId))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound(new { message = $"Заявка {id} не найдена" });

            if (order.Status != "pending")
                return BadRequest(new { message = $"Нельзя отклонить заявку со статусом '{order.Status}'" });

            if (!user.IsAdmin)
            {
                var courseIds = order.OrderItems.Select(oi => oi.CourseId).ToList();
                var isInstructorOfCourses = await _context.Courses
                    .AnyAsync(c => courseIds.Contains(c.Id) && c.InstructorId == userId);

                if (!user.IsInstructor || !isInstructorOfCourses)
                    return Unauthorized();
            }

            order.Status = "rejected";
            await _context.SaveChangesAsync();

            _logger.LogInformation("Order {OrderId} rejected by user {UserId}", id, userId);

            return Ok(new { message = "Заявка отклонена", orderId = id });
        }
    }
}
