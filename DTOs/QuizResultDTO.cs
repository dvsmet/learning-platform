namespace LearningPlatformAPI.DTOs
{
    public class QuizResultDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public UserDTO? User { get; set; }
        public int QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;
        public int Score { get; set; }
        public DateTime CompletionDate { get; set; }
    }
}