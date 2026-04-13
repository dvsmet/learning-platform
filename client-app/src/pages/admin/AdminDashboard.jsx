import { Routes, Route, Navigate } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import CategoryIcon from '@mui/icons-material/Category';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import DashboardLayout from '../../components/DashboardLayout';
import AnalyticsTab from '../../components/AnalyticsTab';
import UsersTab from './UsersTab';
import ChatTab from '../instructor/ChatTab';
import ProfileTab from './ProfileTab';
import CoursesTab from './CoursesTab';
import CategoriesTab from './CategoriesTab';
import LessonsTab from './LessonsTab';
import QuizzesTab from './QuizzesTab';
import OrdersTab from './OrdersTab';
import ReviewsTab from './ReviewsTab';

const menuItems = [
  { path: '/admin/analytics', label: 'Аналитика', icon: <BarChartIcon /> },
  { path: '/admin/users', label: 'Пользователи', icon: <PeopleIcon /> },
  { path: '/admin/courses', label: 'Курсы', icon: <SchoolIcon /> },
  { path: '/admin/categories', label: 'Категории', icon: <CategoryIcon /> },
  { path: '/admin/lessons', label: 'Уроки', icon: <MenuBookIcon /> },
  { path: '/admin/quizzes', label: 'Тесты', icon: <QuizIcon /> },
  { path: '/admin/orders', label: 'Заявки', icon: <AssignmentIcon /> },
  { path: '/admin/reviews', label: 'Отзывы', icon: <RateReviewIcon /> },
  { path: '/admin/chat', label: 'Чаты', icon: <ChatIcon /> },
  { path: '/admin/profile', label: 'Профиль', icon: <PersonIcon /> },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout menuItems={menuItems} title="Корпоративная платформа обучения">
      <Routes>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="analytics" element={<AnalyticsTab subtitle="Сводка по инструкторам и всем курсам." chatPath="/admin/chat" />} />
        <Route path="users" element={<UsersTab />} />
        <Route path="courses" element={<CoursesTab />} />
        <Route path="categories" element={<CategoriesTab />} />
        <Route path="lessons" element={<LessonsTab />} />
        <Route path="quizzes" element={<QuizzesTab />} />
        <Route path="orders" element={<OrdersTab />} />
        <Route path="reviews" element={<ReviewsTab />} />
        <Route path="chat" element={<ChatTab />} />
        <Route path="profile" element={<ProfileTab />} />
      </Routes>
    </DashboardLayout>
  );
}
