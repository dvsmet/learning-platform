using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Models;
using AutoMapper;
using System.Linq;


namespace LearningPlatformAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public abstract class GenericController<TEntity, TDto> : ControllerBase
        where TEntity : class
        where TDto : class
    {
        protected readonly LearningPlatformContext _context;
        protected readonly DbSet<TEntity> _dbSet;
        protected readonly IMapper _mapper;

        public GenericController(LearningPlatformContext context, IMapper mapper)
        {
            _context = context;
            _dbSet = context.Set<TEntity>();
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TDto>>> GetAll()
        {
            var entities = await GetQueryWithIncludes().ToListAsync();
            return Ok(_mapper.Map<IEnumerable<TDto>>(entities));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TDto>> GetById(int id)
        {
            var entity = await GetQueryWithIncludes()
                .FirstOrDefaultAsync(e => EF.Property<int>(e, "Id") == id);
            
            if (entity == null)
                return NotFound();

            return Ok(_mapper.Map<TDto>(entity));
        }

        [HttpPost]
        public async Task<ActionResult<TDto>> Create(TDto dto)
        {
            var entity = _mapper.Map<TEntity>(dto);
            _dbSet.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), 
                new { id = EF.Property<int>(entity, "Id") }, 
                _mapper.Map<TDto>(entity));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, TDto dto)
        {
            var entity = await _dbSet.FindAsync(id);
            if (entity == null)
                return NotFound();

            _mapper.Map(dto, entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _dbSet.FindAsync(id);
            if (entity == null)
                return NotFound();

            _dbSet.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        protected virtual IQueryable<TEntity> GetQueryWithIncludes()
        {
            return _dbSet;
        }
    }
}