namespace LearningPlatformAPI.DTOs
{
    public class LoginResponseDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }
        public bool IsAdmin { get; set; }
        public bool IsInstructor { get; set; }
    }
}
