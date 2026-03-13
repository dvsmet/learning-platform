using AutoMapper;
using LearningPlatformAPI.Models;
using LearningPlatformAPI.DTOs;

namespace LearningPlatformAPI.Mapping
{
    public class AutoMapperProfile : Profile
    {
        public AutoMapperProfile()
        {
            // User
            CreateMap<User, UserDTO>();
            CreateMap<UserDTO, User>()
                .ForMember(dest => dest.IsInstructor, opt => opt.MapFrom(src => src.IsInstructor))
                .ForMember(dest => dest.IsAdmin, opt => opt.MapFrom(src => src.IsAdmin));

            // Course
            CreateMap<Course, CourseDTO>();
            CreateMap<CourseDTO, Course>();

            // Order
            CreateMap<Order, OrderDTO>();
            CreateMap<OrderDTO, Order>();

            // OrderItem
            CreateMap<OrderItem, OrderItemDTO>();
            CreateMap<OrderItemDTO, OrderItem>();

            // Lesson
            CreateMap<Lesson, LessonDTO>();
            CreateMap<LessonDTO, Lesson>();

            // Quiz (basic — overridden below with nested ordering)

            // QuizResult
            CreateMap<QuizResult, QuizResultDTO>();
            CreateMap<QuizResultDTO, QuizResult>();

            // LearningProgress
            CreateMap<LearningProgress, LearningProgressDTO>();
            CreateMap<LearningProgressDTO, LearningProgress>();

            // Review
            CreateMap<Review, ReviewDTO>();
            CreateMap<ReviewDTO, Review>();

            // Quiz + nested (with stable ordering by Id)
            CreateMap<Quiz, QuizDTO>()
                .ForMember(d => d.Questions, o => o.MapFrom(
                    s => s.Questions.OrderBy(q => q.Id)));
            CreateMap<QuizDTO, Quiz>();

            CreateMap<QuizQuestion, QuizQuestionDTO>()
                .ForMember(d => d.Options, o => o.MapFrom(
                    s => s.Options.OrderBy(opt => opt.Id)));
            CreateMap<QuizQuestionDTO, QuizQuestion>();

            CreateMap<QuizOption, QuizOptionDTO>().ReverseMap();

            // Chat
            CreateMap<ChatMessage, ChatMessageDTO>();
        }
    }
}
