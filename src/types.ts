export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string]; // 4 đáp án A, B, C, D
  correctIndex: number; // 0 = A, 1 = B, 2 = C, 3 = D (1 đúng, 3 sai)
}

export interface AppSettings {
  schoolName: string;
  prizesText: string;
  // Điều chỉnh 1: Phần quà dành cho tất cả các Khoa và đạt lớn hơn điểm 8
  highScoreTargetPrize: string;
  highScorePriorityRate: number;
  // Điều chỉnh 2: Phần quà dành cho Khoa Chăn nuôi, Thú y
  vetDeptKeywords: string;
  vetDeptTargetPrize: string;
  vetDeptPriorityRate: number;
  // Bộ 10 câu hỏi trắc nghiệm
  questions: QuizQuestion[];
}

export interface StudentSubmission {
  id: string;
  name: string;
  phone: string;
  school: string;
  department: string;
  year: string;
  answers: number[];
  score: number; // Điểm trên thang 10
  totalQuestions: number;
  submittedAt: string;
  hasSpun: boolean;
  wonPrize?: string;
}

export interface WinnerRecord {
  id: string;
  submissionId?: string;
  name: string;
  phone: string;
  school: string;
  department: string;
  year: string;
  score: number;
  prize: string;
  timestamp: string;
  appliedRule?: string;
}

export const DEFAULT_PRIZES = [
  'Balo Laptop Thương Hiệu',
  'Bình Giữ Nhiệt Inox Cao Cấp',
  'Áo Mưa Cánh Dơi Kỷ Niệm',
  'Sổ Tay Da & Bút Ký',
  'Móc Khóa Gấu Bông Tuyển Dụng',
  'Chuột Không Dây Văn Phòng',
  'Voucher Trà Sữa 50.000đ',
  'Quạt Cầm Tay Mini USB'
].join('\n');

export const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Công ty Cổ phần Thái Việt Corporation hoạt động nổi bật trong lĩnh vực chính nào sau đây?',
    options: [
      'Nông nghiệp công nghệ cao, chăn nuôi và chuỗi thực phẩm an toàn',
      'Sản xuất linh kiện hàng không vũ trụ',
      'Khai thác khoáng sản biển sâu',
      'Dịch vụ vận tải đường sắt đô thị'
    ],
    correctIndex: 0
  },
  {
    id: 2,
    question: 'Trong quy trình chăn nuôi an toàn sinh học hiện đại, yếu tố nào đóng vai trò quan trọng hàng đầu để phòng dịch bệnh?',
    options: [
      'Kiểm soát nghiêm ngặt nguồn giống, vệ sinh sát trùng và cách ly khu vực nuôi',
      'Chỉ sử dụng thức ăn tự nhiên không qua kiểm định',
      'Cho khách tham quan tự do ra vào chuồng trại mỗi ngày',
      'Không cần tiêm phòng vắc-xin định kỳ'
    ],
    correctIndex: 0
  },
  {
    id: 3,
    question: 'Kỹ năng nào sau đây giúp sinh viên mới ra trường hòa nhập nhanh và phát triển tốt tại doanh nghiệp?',
    options: [
      'Chủ động học hỏi, tinh thần trách nhiệm và làm việc nhóm hiệu quả',
      'Làm việc độc lập tuyệt đối và từ chối mọi sự góp ý',
      'Chỉ làm đúng những việc đã học trong sách vở, ngại đổi mới',
      'Tránh giao tiếp với đồng nghiệp và quản lý'
    ],
    correctIndex: 0
  },
  {
    id: 4,
    question: 'Nhiệt độ thân nhiệt bình thường của heo (lợn) khỏe mạnh trưởng thành nằm trong khoảng nào?',
    options: [
      'Khoảng 38.5°C – 39.5°C',
      'Khoảng 34.0°C – 35.5°C',
      'Khoảng 42.0°C – 44.0°C',
      'Khoảng 30.0°C – 32.0°C'
    ],
    correctIndex: 0
  },
  {
    id: 5,
    question: 'Mục đích chính của việc tiêm vắc-xin phòng bệnh cho vật nuôi trong trang trại là gì?',
    options: [
      'Kích thích hệ miễn dịch tạo kháng thể chủ động bảo vệ vật nuôi trước mầm bệnh',
      'Thay thế hoàn toàn nhu cầu cung cấp nước uống hàng ngày',
      'Làm giảm trọng lượng vật nuôi trước khi xuất chuồng',
      'Giúp chuồng trại tự động giảm nhiệt độ vào mùa hè'
    ],
    correctIndex: 0
  },
  {
    id: 6,
    question: 'Trong dinh dưỡng vật nuôi, nhóm chất nào đóng vai trò chính trong việc xây dựng tế bào, cơ bắp và mô cơ thể?',
    options: [
      'Protein (Chất đạm)',
      'Chất xơ thô không tiêu hóa',
      'Nước cất tinh khiết',
      'Khí Nitơ trong không khí'
    ],
    correctIndex: 0
  },
  {
    id: 7,
    question: 'Khi tham gia phỏng vấn tuyển dụng tại Ngày Hội Việc Làm, ứng viên nên chuẩn bị điều gì?',
    options: [
      'Tìm hiểu kỹ về công ty, vị trí ứng tuyển và thể hiện thái độ cầu thị, tự tin',
      'Không cần tìm hiểu thông tin gì về doanh nghiệp tuyển dụng',
      'Đến muộn hơn giờ hẹn 30 phút để tạo sự chú ý',
      'Trả lời qua loa và không đặt bất kỳ câu hỏi nào'
    ],
    correctIndex: 0
  },
  {
    id: 8,
    question: 'Hệ thống chuồng kín (chuồng lạnh) trong chăn nuôi công nghiệp mang lại lợi ích nổi bật nào?',
    options: [
      'Chủ động kiểm soát nhiệt độ, độ ẩm, thông gió và hạn chế mầm bệnh từ bên ngoài',
      'Tăng sự tiếp xúc trực tiếp giữa vật nuôi với chim hoang dã',
      'Phụ thuộc hoàn toàn vào thời tiết mưa nắng tự nhiên',
      'Không cần hệ thống quạt thông gió hay làm mát'
    ],
    correctIndex: 0
  },
  {
    id: 9,
    question: 'Việc ghi chép nhật ký trang trại và số hóa dữ liệu sản xuất giúp ích gì cho doanh nghiệp?',
    options: [
      'Theo dõi chính xác năng suất, chi phí, dịch tễ và truy xuất nguồn gốc minh bạch',
      'Chỉ để tốn thêm thời gian của kỹ thuật viên trại',
      'Làm giảm khả năng kiểm soát chất lượng sản phẩm',
      'Thay thế hoàn toàn việc chăm sóc vật nuôi hàng ngày'
    ],
    correctIndex: 0
  },
  {
    id: 10,
    question: 'Cơ hội dành cho sinh viên khi thực tập và làm việc tại Công ty Cổ phần Thái Việt Corporation là gì?',
    options: [
      'Được đào tạo bài bản thực tế, môi trường chuyên nghiệp và lộ trình thăng tiến rõ ràng',
      'Không được hướng dẫn chuyên môn trong suốt quá trình làm việc',
      'Chỉ làm các công việc không liên quan đến ngành học',
      'Không có chế độ đãi ngộ hay cơ hội phát triển nghề nghiệp'
    ],
    correctIndex: 0
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  schoolName: 'Đại học Nông Lâm TP.HCM',
  prizesText: DEFAULT_PRIZES,
  highScoreTargetPrize: 'Balo Laptop Thương Hiệu',
  highScorePriorityRate: 85,
  vetDeptKeywords: 'Chăn nuôi, Thú y',
  vetDeptTargetPrize: 'Bình Giữ Nhiệt Inox Cao Cấp',
  vetDeptPriorityRate: 75,
  questions: DEFAULT_QUESTIONS
};
