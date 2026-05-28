export interface ProtocolStep {
  step: number;
  title: string;
  content: string;
  isUrgent?: boolean;
}

export interface Protocol {
  disease: string;
  diseaseCode: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
  steps: ProtocolStep[];
  emergencyWarning: string;
  emergencySymptoms: string[];
}

export const protocols: Record<'UCD' | 'MSUD' | 'OA' | 'FAOD', Protocol> = {
  UCD: {
    disease: 'Rối loạn chu trình Urea (UCD)',
    diseaseCode: 'UCD',
    emergencyWarning:
      'Chuyển viện cấp cứu NGAY nếu: trẻ có dấu hiệu thay đổi ý thức (lơ mơ, hôn mê), co giật, thở bất thường, nôn ói liên tục >4 giờ không cải thiện, nghi ngờ NH3 tăng cao. Gọi 115 hoặc đến khoa cấp cứu nhi gần nhất.',
    emergencySymptoms: [
      'Li bì, lơ mơ, hôn mê',
      'Co giật',
      'Thở bất thường (nhanh, yếu, ngưng thở)',
      'Nôn liên tục >4 giờ',
      'NH3 tăng cao nghi ngờ',
      'Sốt cao kèm bỏ ăn hoàn toàn',
    ],
    steps: [
      {
        step: 1,
        title: 'Tạm ngừng đạm tối đa 48 giờ',
        content:
          'Ngừng tất cả nguồn protein tự nhiên (sữa mẹ, sữa công thức thông thường, thức ăn có đạm) trong tối đa 48 giờ. KHÔNG ngừng quá 48 giờ để tránh dị hóa cơ thể. Tiếp tục công thức đặc biệt không có nitrogen nếu trẻ dung nạp được.',
        isUrgent: false,
      },
      {
        step: 2,
        title: 'Bổ sung năng lượng bằng glucose polymer',
        content:
          'Cung cấp đủ năng lượng bằng glucose polymer (maltodextrin) pha theo đúng nồng độ và liều lượng tính theo cân nặng và tuổi (xem bảng tính liều bên dưới). Cho uống mỗi 2 giờ, không để trẻ nhịn đói. Nếu trẻ không uống được, liên hệ bác sĩ ngay.',
        isUrgent: false,
      },
      {
        step: 3,
        title: 'Tiếp tục thuốc scavenger và thuốc hỗ trợ',
        content:
          'KHÔNG ngừng thuốc bắt NH3 (sodium benzoate, sodium phenylbutyrate, sodium phenylacetate/benzoate...) trong bất kỳ hoàn cảnh nào. Tiếp tục arginine, citrulline theo chỉ định. Nếu không uống được do nôn, liên hệ bác sĩ để xem xét dùng đường tĩnh mạch tại bệnh viện.',
        isUrgent: true,
      },
      {
        step: 4,
        title: 'Kiểm soát sốt và nhiễm trùng',
        content:
          'Hạ sốt tích cực bằng paracetamol (10-15mg/kg/lần, mỗi 4-6 giờ) khi nhiệt độ >38°C. Tìm và điều trị nguyên nhân nhiễm trùng. Sốt làm tăng dị hóa protein và tăng NH3. Theo dõi nhiệt độ mỗi 4 giờ. Đảm bảo bù nước đầy đủ.',
        isUrgent: false,
      },
      {
        step: 5,
        title: 'Tái giới thiệu protein sau 24-48 giờ',
        content:
          'Sau 24-48 giờ hoặc khi trẻ ổn định (không sốt, ăn uống tốt hơn, ý thức bình thường), bắt đầu lại protein ở mức 50% nhu cầu, tăng dần về khẩu phần đầy đủ trong 24-48 giờ tiếp theo. Liên hệ dinh dưỡng viên/bác sĩ chuyên khoa để điều chỉnh kế hoạch ăn.',
        isUrgent: false,
      },
    ],
  },

  MSUD: {
    disease: 'Bệnh Siro Phong (MSUD)',
    diseaseCode: 'MSUD',
    emergencyWarning:
      'Chuyển viện cấp cứu NGAY nếu: thay đổi ý thức, co giật, ngưng thở, tư thế cứng cong lưng (opisthotonus), mùi siro phong mạnh đột ngột, đồng tử không đều. Đây là cấp cứu chuyển hóa - KHÔNG trì hoãn.',
    emergencySymptoms: [
      'Thay đổi ý thức (lơ mơ, hôn mê)',
      'Co giật',
      'Ngưng thở (apnea)',
      'Tư thế cong cứng (opisthotonus), đạp đạp chân',
      'Mùi siro phong mạnh đột ngột',
      'Đồng tử không đều',
      'Nôn liên tục >4 giờ',
    ],
    steps: [
      {
        step: 1,
        title: 'Tăng công thức BCAA-free lên 120% nhu cầu',
        content:
          'Tăng lượng công thức không có BCAA (Leucine, Isoleucine, Valine) lên 120% nhu cầu thông thường để cung cấp đủ amino acid thiết yếu khác và năng lượng, đồng thời ức chế dị hóa. Không giảm công thức đặc biệt này trong bệnh cảnh cấp.',
        isUrgent: false,
      },
      {
        step: 2,
        title: 'Giảm Leucine từ thức ăn tự nhiên',
        content:
          'Giảm tối đa nguồn Leucine từ thức ăn tự nhiên (protein động vật, đậu, ngũ cốc). Leucine là amino acid nguy hiểm nhất trong MSUD vì tích lũy nhanh và độc thần kinh. Tạm thời ngừng thức ăn giàu protein trong 24-48 giờ đầu của bệnh cảnh cấp.',
        isUrgent: true,
      },
      {
        step: 3,
        title: 'Bổ sung glucose polymer cung cấp năng lượng',
        content:
          'Cho uống glucose polymer (maltodextrin) theo liều tính theo cân nặng và tuổi để đảm bảo đủ năng lượng, ngăn dị hóa. Cho uống mỗi 2 giờ. Glucose polymer giúp ức chế phân giải protein cơ thể và giảm tích lũy BCAA.',
        isUrgent: false,
      },
      {
        step: 4,
        title: 'Tiếp tục bổ sung Isoleucine và Valine',
        content:
          'Trong MSUD, Isoleucine (Ile) và Valine (Val) thường bị thiếu hụt do ăn kiêng nghiêm ngặt. Tiếp tục bổ sung Ile và Val theo chỉ định của bác sĩ chuyên khoa. KHÔNG tự tăng liều. Thiếu Ile và Val có thể gây hôn mê giả mạo tăng BCAA.',
        isUrgent: false,
      },
      {
        step: 5,
        title: 'Theo dõi mỗi 4 giờ',
        content:
          'Kiểm tra tình trạng thần kinh (mức độ tỉnh táo, phản ứng, mùi nước tiểu) mỗi 4 giờ. Đo đường huyết nếu có. Ghi nhận lượng công thức uống được. Nếu không uống được >2-3 liều liên tiếp hoặc triệu chứng xấu đi → liên hệ bác sĩ NGAY. Chụp ảnh/video nếu thấy triệu chứng thần kinh bất thường.',
        isUrgent: false,
      },
    ],
  },

  OA: {
    disease: 'Acid Hữu Cơ Niệu (OA - IVA/PA/MMA)',
    diseaseCode: 'OA',
    emergencyWarning:
      'Chuyển viện cấp cứu NGAY nếu: thở kiểu Kussmaul (nhanh sâu), thay đổi ý thức, co giật, tím tái, rối loạn nhịp tim, chảy máu bất thường, dấu hiệu nhiễm trùng nặng, ketone niệu "+++" liên tục. Toan chuyển hóa nặng cần điều trị tĩnh mạch khẩn cấp.',
    emergencySymptoms: [
      'Thở kiểu Kussmaul (nhanh, sâu, có mùi)',
      'Thay đổi ý thức',
      'Co giật',
      'Tím tái, chi lạnh',
      'Rối loạn nhịp tim',
      'Chảy máu bất thường',
      'Nhiễm trùng nặng (sốt cao, shock)',
      'Ketone niệu "+++"',
    ],
    steps: [
      {
        step: 1,
        title: 'Ngừng protein tối đa 24-48 giờ',
        content:
          'Tạm ngừng tất cả nguồn protein tự nhiên trong tối đa 24-48 giờ (ngắn hơn UCD vì nguy cơ dị hóa cao hơn). Tiếp tục công thức đặc biệt không có amino acid tiền chất (không có Isovaleryl-CoA cho IVA, không có Propionyl-CoA cho PA/MMA). Không ngừng quá 48 giờ.',
        isUrgent: false,
      },
      {
        step: 2,
        title: 'Tăng cung cấp năng lượng 110-120% nhu cầu',
        content:
          'Tăng năng lượng lên 110-120% nhu cầu cơ bản bằng glucose polymer, dầu ăn an toàn (tránh dầu chứa axit béo lẻ số carbon cho PA/MMA). Năng lượng cao giúp ức chế dị hóa, giảm sản xuất axit hữu cơ. Cho ăn/uống thường xuyên, không để nhịn.',
        isUrgent: false,
      },
      {
        step: 3,
        title: 'Tăng liều L-Carnitine',
        content:
          'Tăng liều L-Carnitine lên 200-300mg/kg/ngày (tối đa 3g/ngày) trong bệnh cảnh cấp để thải các acyl-CoA tích lũy ra khỏi ti thể dưới dạng acylcarnitine. Carnitine đặc biệt quan trọng trong IVA (isovaleryl-carnitine) và PA/MMA. Tiếp tục liều cao cho đến khi ổn định.',
        isUrgent: true,
      },
      {
        step: 4,
        title: 'Theo dõi ketone niệu 2 lần/ngày',
        content:
          'Đo ketone niệu buổi sáng (lúc đói) và buổi tối. Ketone "+" là có thể chấp nhận khi bệnh nhân đang ổn định nhưng cần theo dõi. "++" hoặc "+++" là dấu hiệu cảnh báo cần liên hệ bác sĩ. Ghi nhận kết quả vào nhật ký theo dõi. Nếu ketone tăng kèm nôn ói → đến cơ sở y tế ngay.',
        isUrgent: false,
      },
      {
        step: 5,
        title: 'Tiếp tục thuốc và theo dõi',
        content:
          'Tiếp tục tất cả thuốc đang dùng (Biotin cho PA, B12 cho MMA dạng nhạy cảm, L-Carnitine, Metronidazole nếu chỉ định). Theo dõi lượng ăn uống và ghi chép. Liên hệ bác sĩ nếu: không ăn uống được >4 giờ, triệu chứng xấu đi, ketone niệu tăng, hoặc sốt cao không hạ.',
        isUrgent: false,
      },
    ],
  },

  FAOD: {
    disease: 'Rối loạn Oxy hóa Axit Béo (FAOD)',
    diseaseCode: 'FAOD',
    emergencyWarning:
      'Chuyển viện cấp cứu NGAY nếu: hạ đường huyết có triệu chứng (run rẩy, vã mồ hôi, hôn mê), nước tiểu màu nâu/đen (myoglobin niệu), khó thở, rối loạn nhịp tim, đau cơ dữ dội toàn thân, yếu liệt chi. KHÔNG ĐỂ TRẺ NHỊN ĐÓI trong bất kỳ hoàn cảnh nào.',
    emergencySymptoms: [
      'Hạ đường huyết có triệu chứng (glucose <3.3 mmol/L)',
      'Nước tiểu màu nâu/đen (myoglobin niệu)',
      'Khó thở, thở nhanh',
      'Rối loạn nhịp tim, đau ngực',
      'Đau cơ dữ dội, yếu liệt',
      'Thay đổi ý thức',
      'Phù, khó thở (cardiomyopathy)',
    ],
    steps: [
      {
        step: 1,
        title: 'TUYỆT ĐỐI KHÔNG để nhịn đói',
        content:
          'Đây là nguyên tắc QUAN TRỌNG NHẤT trong FAOD. KHÔNG để trẻ nhịn đói quá thời gian an toàn theo tuổi (sơ sinh: tối đa 3-4 giờ; <1 tuổi: 4 giờ; 1-7 tuổi: 6-8 giờ; >7 tuổi: 8-10 giờ). Khi bệnh (sốt, nôn, tiêu chảy), rút ngắn thời gian nhịn xuống còn 1/2. Nếu không ăn được → đến bệnh viện ngay.',
        isUrgent: true,
      },
      {
        step: 2,
        title: 'Cho uống glucose polymer mỗi 2 giờ',
        content:
          'Khi có bệnh cảnh cấp, cho uống glucose polymer theo liều tính theo cân nặng (xem bảng tính liều) mỗi 2 giờ liên tục, kể cả ban đêm. Glucose polymer cung cấp năng lượng nhanh từ đường, ngăn cơ thể phải đốt mỡ (vốn là nguyên nhân nguy hiểm trong FAOD). Không bỏ bất kỳ liều nào.',
        isUrgent: false,
      },
      {
        step: 3,
        title: 'Tiếp tục MCT (cho FAOD chuỗi dài LC-FAOD)',
        content:
          'Đối với FAOD chuỗi dài (LCHAD, VLCAD, TFP): tiếp tục dầu MCT (Medium Chain Triglyceride) vì MCT có thể oxy hóa bình thường, cung cấp năng lượng an toàn. Không cho thức ăn giàu axit béo chuỗi dài trong bệnh cảnh cấp. Đối với MCAD: tránh nhịn đói, không cần MCT đặc biệt.',
        isUrgent: false,
      },
      {
        step: 4,
        title: 'Theo dõi đường huyết mỗi 4 giờ',
        content:
          'Đo đường huyết mao mạch (máy đo tại nhà) mỗi 4 giờ trong suốt bệnh cảnh cấp, kể cả ban đêm. Mục tiêu: đường huyết >3.9 mmol/L (>70 mg/dL). Nếu đường huyết 3.3-3.9: tăng tần suất glucose polymer. Nếu <3.3 hoặc có triệu chứng hạ đường huyết: cho glucose qua miệng ngay và đến cơ sở y tế KHẨN.',
        isUrgent: false,
      },
      {
        step: 5,
        title: 'L-Carnitine chỉ dành cho CUD',
        content:
          'L-Carnitine liều cao chỉ được chỉ định cho trẻ mắc Carnitine Uptake Deficiency (CUD). KHÔNG tự ý dùng L-Carnitine cho các dạng FAOD khác (LCHAD, VLCAD, MCAD) vì có thể gây tích lũy các long-chain acylcarnitine độc hại. Tiếp tục tất cả thuốc đang được chỉ định, không tự ngừng.',
        isUrgent: false,
      },
    ],
  },
};

export function getProtocol(diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD'): Protocol {
  return protocols[diagnosis];
}
