using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("course_categories")]
    public class CourseCategories
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("category_name")]
        public string CategoryName { get; set; } = string.Empty;

        public virtual ICollection<CourseCategory> CourseCategory { get; set; } = new List<CourseCategory>();
    }
}

