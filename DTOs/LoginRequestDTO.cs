using System.Text.Json.Serialization;

namespace LearningPlatformAPI.DTOs
{
    public class LoginRequestDTO
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }
}
