using System;

namespace LearningPlatformAPI.DTOs
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public UserDTO? User { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<OrderItemDTO>? OrderItems { get; set; }
        public decimal TotalAmount { get; set; } = 0m;
    }
}