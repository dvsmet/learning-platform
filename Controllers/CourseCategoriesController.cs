using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Models;
using AutoMapper;

namespace LearningPlatformAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CourseCategoriesController : ControllerBase
    {
        private readonly LearningPlatformContext _context;

        public CourseCategoriesController(LearningPlatformContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CourseCategories>>> GetAll()
        {
            return await _context.CourseCategories.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CourseCategories>> GetById(int id)
        {
            var item = await _context.CourseCategories.FindAsync(id);
            if (item == null) return NotFound();
            return item;
        }

        [HttpPost]
        public async Task<ActionResult<CourseCategories>> Create(CourseCategories model)
        {
            _context.CourseCategories.Add(model);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.Id }, model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, CourseCategories model)
        {
            if (id != model.Id) return BadRequest();
            _context.Entry(model).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.CourseCategories.Any(e => e.Id == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.CourseCategories.FindAsync(id);
            if (item == null) return NotFound();
            _context.CourseCategories.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
