namespace LearningPlatformAPI.DTOs
{
    public class UserDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }

        public bool IsInstructor { get; set; } = false;

        public bool IsAdmin { get; set; } = false;
    }
}