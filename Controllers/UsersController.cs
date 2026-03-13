using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading.Tasks;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Models;
using LearningPlatformAPI.DTOs;
using AutoMapper;
using System.Text.Json;
using BCrypt.Net;

namespace LearningPlatformAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly LearningPlatformContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<UsersController> _logger;

        public UsersController(LearningPlatformContext context, IMapper mapper, ILogger<UsersController> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetAll()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(_mapper.Map<IEnumerable<UserDTO>>(users));
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDTO>> GetById(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return Ok(_mapper.Map<UserDTO>(user));
        }

        [HttpPost]
        public async Task<ActionResult<UserDTO>> Create([FromBody] JsonElement body)
        {
            var name = body.TryGetProperty("name", out var n) ? n.GetString() ?? string.Empty : string.Empty;
            var email = body.TryGetProperty("email", out var e) ? e.GetString() ?? string.Empty : string.Empty;
            var password = body.TryGetProperty("password", out var p) ? p.GetString() ?? string.Empty : string.Empty;

            var isAdmin = false;
            var isInstructor = false;

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) &&
                int.TryParse(uidVals.FirstOrDefault(), out var requesterId))
            {
                var requester = await _context.Users.FindAsync(requesterId);
                if (requester != null && requester.IsAdmin)
                {
                    isAdmin = body.TryGetProperty("isAdmin", out var a) && a.GetBoolean();
                    isInstructor = body.TryGetProperty("isInstructor", out var i) && i.GetBoolean();
                }
            }

            var user = new User
            {
                Name = name,
                Email = email,
                IsAdmin = isAdmin,
                IsInstructor = isInstructor,
                Password = string.IsNullOrEmpty(password) ? string.Empty : BCrypt.Net.BCrypt.HashPassword(password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = user.Id }, _mapper.Map<UserDTO>(user));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] JsonElement body)
        {
            var entity = await _context.Users.FindAsync(id);
            if (entity == null) return NotFound();

            if (body.TryGetProperty("name", out var n)) entity.Name = n.GetString() ?? entity.Name;
            if (body.TryGetProperty("email", out var e)) entity.Email = e.GetString() ?? entity.Email;

            if (Request.Headers.TryGetValue("X-User-Id", out var uidVals) &&
                int.TryParse(uidVals.FirstOrDefault(), out var requesterId))
            {
                var requester = await _context.Users.FindAsync(requesterId);
                if (requester != null && requester.IsAdmin)
                {
                    if (body.TryGetProperty("isAdmin", out var a)) entity.IsAdmin = a.GetBoolean();
                    if (body.TryGetProperty("isInstructor", out var i)) entity.IsInstructor = i.GetBoolean();
                }
            }

            if (body.TryGetProperty("password", out var p))
            {
                var raw = p.GetString() ?? string.Empty;
                if (!string.IsNullOrEmpty(raw))
                {
                    entity.Password = BCrypt.Net.BCrypt.HashPassword(raw);
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.Users.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Users.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // POST: api/Users/login
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDTO>> Login([FromBody] LoginRequestDTO request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Email))
                    return BadRequest(new { message = "Email required" });

                var emailTrim = request.Email.Trim().ToLowerInvariant();
                var password = request.Password ?? string.Empty;

                // Ищем пользователя по email (без учета регистра)
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == emailTrim);

                if (user == null)
                {
                    return Unauthorized(new { message = "Неверный email или пароль" });
                }

                var storedPassword = user.Password?.Trim() ?? string.Empty;
                var providedPassword = password.Trim();

                if (string.IsNullOrEmpty(providedPassword))
                {
                    return BadRequest(new { message = "Пароль не может быть пустым" });
                }

                var verified = false;

                // Проверяем, является ли сохраненный пароль хешем BCrypt
                if (!string.IsNullOrEmpty(storedPassword) && 
                    (storedPassword.StartsWith("$2y$") || 
                     storedPassword.StartsWith("$2b$") || 
                     storedPassword.StartsWith("$2a$") ||
                     storedPassword.StartsWith("$2x$")))
                {
                    // Проверяем через BCrypt
                    try
                    {
                        verified = BCrypt.Net.BCrypt.Verify(providedPassword, storedPassword);
                    }
                    catch
                    {
                        // Если ошибка при проверке BCrypt, пробуем простое сравнение
                        verified = storedPassword == providedPassword;
                    }
                }
                else
                {
                    // Простое сравнение (для старых паролей без хеширования)
                    verified = storedPassword == providedPassword;
                    
                    // Если пароль совпал и он не был захеширован, хешируем его
                    if (verified && !string.IsNullOrEmpty(storedPassword))
                    {
                        user.Password = BCrypt.Net.BCrypt.HashPassword(providedPassword);
                        await _context.SaveChangesAsync();
                    }
                }

                if (!verified)
                {
                    return Unauthorized(new { message = "Неверный пароль" });
                }

                var response = new LoginResponseDTO
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    RegistrationDate = user.RegistrationDate,
                    IsAdmin = user.IsAdmin,
                    IsInstructor = user.IsInstructor
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login failed for {Email}", request?.Email);
                return StatusCode(500, new { message = "Ошибка при входе в систему" });
            }
        }

        [HttpPost("{id}/reset-password-admin")]
        public async Task<ActionResult> ResetPasswordAdmin(int id)
        {
            if (!Request.Headers.TryGetValue("X-User-Id", out var uidVals) || !int.TryParse(uidVals.FirstOrDefault(), out var adminId))
                return Unauthorized();

            var adminUser = await _context.Users.FindAsync(adminId);
            if (adminUser == null || !adminUser.IsAdmin) return Unauthorized();

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            string GenerateTemp(int len = 10)
            {
                const string src = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
                var data = new byte[len];
                System.Security.Cryptography.RandomNumberGenerator.Fill(data);
                var chars = data.Select(b => src[b % src.Length]).ToArray();
                return new string(chars);
            }

            var temp = GenerateTemp(10);
            user.Password = BCrypt.Net.BCrypt.HashPassword(temp);
            await _context.SaveChangesAsync();

            return Ok(new { tempPassword = temp });
        }

        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] JsonElement body)
        {
            if (!body.TryGetProperty("newPassword", out var p)) return BadRequest(new { message = "newPassword required" });
            var newPassword = p.GetString() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(newPassword)) return BadRequest(new { message = "newPassword cannot be empty" });

            if (!Request.Headers.TryGetValue("X-User-Id", out var uidVals) || !int.TryParse(uidVals.FirstOrDefault(), out var requesterId))
                return Unauthorized();

            var requester = await _context.Users.FindAsync(requesterId);
            if (requester == null) return Unauthorized();

            if (requesterId != id && !requester.IsAdmin) return Unauthorized();

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

