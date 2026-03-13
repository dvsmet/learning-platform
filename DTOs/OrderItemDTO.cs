using LearningPlatformAPI.DTOs;

namespace LearningPlatformAPI.DTOs
{
    public class OrderItemDTO
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int CourseId { get; set; }
        public CourseDTO? Course { get; set; }
        public decimal PriceAtPurchase { get; set; }
    }
}
