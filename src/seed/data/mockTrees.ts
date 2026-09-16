// Dữ liệu seed lấy nguyên từ prototype durian-tree/src/data/mockTrees.ts (03_DATABASE §8).
// Kiểu để lỏng: đây là dữ liệu nguồn dạng cũ (date + time tách rời), seed.ts chuẩn hoá lại.

export const INITIAL_TREES: any[] = [
  {
    id: 'SD-001',
    code: 'SD-001',
    variety: 'Ri6',
    age: 6,
    plantedDate: '2020-06-12',
    location: {
      block: 'A',
      row: '03',
      position: '12',
      coordinates: { lat: 10.4582, lng: 107.2145 }
    },
    status: 'healthy',
    healthScore: 92,
    soilMoisture: 68,
    leafCondition: 'good',
    flowering: false,
    floweringStage: 'Chưa vào vụ hoa',
    fruitCondition: 'developing',
    fruitCount: 42,
    heightMeters: 4.8,
    trunkDiameterCm: 28,
    lastUpdated: '2026-09-15T08:30:00',
    lastUpdatedBy: 'Nguyễn Văn An (KTV)',
    image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=800&q=80'
    ],
    notes: 'Cây sinh trưởng mạnh, tán đều 4 hướng, cành cấp 1 phân bổ chuẩn. Đang nuôi 42 trái tròn đều, gai xanh bóng.',
    history: [
      {
        id: 'h-001-1',
        date: '15/09/2026',
        time: '08:30',
        activity: 'Kiểm tra sức khỏe định kỳ',
        type: 'health_check',
        status: 'healthy',
        description: 'Đọt già đều, không phát hiện rầy chổng cánh hay rệp sáp. Đất ẩm tốt, rễ tơ trắng phát triển mạnh.',
        performer: 'Nguyễn Văn An',
        measurements: { height: 4.8, trunkDiameter: 28, soilMoisture: 68, fruitCount: 42 }
      },
      {
        id: 'h-001-2',
        date: '13/09/2026',
        time: '16:00',
        activity: 'Tưới nước tự động',
        type: 'watering',
        dosage: '30 Lít',
        description: 'Tưới béc phun xoay bù áp gốc 30 phút, lượng nước đạt 30L quanh tán.',
        performer: 'Hệ thống hẹn giờ Lô A'
      },
      {
        id: 'h-001-3',
        date: '10/09/2026',
        time: '07:15',
        activity: 'Bón phân hữu cơ & NPK',
        type: 'fertilizing',
        dosage: 'NPK 16-16-8 (350g) + 2kg phân trùn quế',
        description: 'Rải đều theo hình chiếu tán cây, tưới đẫm sau khi bón.',
        performer: 'Trần Đình Trọng'
      },
      {
        id: 'h-001-4',
        date: '05/09/2026',
        time: '17:30',
        activity: 'Phun thuốc phòng bệnh nấm',
        type: 'spraying',
        dosage: 'Mancozeb xanh + Chitosan hữu cơ',
        description: 'Phun ướt đều 2 mặt lá và quét nhẹ gốc ngừa Phytophthora mùa mưa.',
        performer: 'Đội bảo vệ thực vật số 1'
      }
    ]
  },
  {
    id: 'SD-002',
    code: 'SD-002',
    variety: 'Monthong (Dona)',
    age: 7,
    plantedDate: '2019-10-20',
    location: {
      block: 'A',
      row: '03',
      position: '14',
      coordinates: { lat: 10.4585, lng: 107.2148 }
    },
    status: 'healthy',
    healthScore: 95,
    soilMoisture: 70,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 56,
    heightMeters: 5.2,
    trunkDiameterCm: 32,
    lastUpdated: '2026-09-14T10:00:00',
    lastUpdatedBy: 'Lê Văn Bình',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=1200&q=80',
    notes: 'Monthong tán xòe đẹp, tỷ lệ đậu trái cao, cơm bắt đầu hình thành múi.',
    history: [
      {
        id: 'h-002-1',
        date: '14/09/2026',
        time: '10:00',
        activity: 'Tỉa trái loại 2 & neo dây',
        type: 'pruning',
        status: 'healthy',
        description: 'Tỉa bỏ 8 trái méo cuống, giữ lại 56 trái cân đối. Cột dây ni-lông trợ lực cho cành cấp 2.',
        performer: 'Lê Văn Bình'
      },
      {
        id: 'h-002-2',
        date: '11/09/2026',
        time: '08:00',
        activity: 'Bón Kali sunfat',
        type: 'fertilizing',
        dosage: 'K2SO4 250g',
        description: 'Tăng độ ngọt và cơm vàng cho trái Monthong tháng thứ 3.',
        performer: 'Trần Đình Trọng'
      }
    ]
  },
  {
    id: 'SD-003',
    code: 'SD-003',
    variety: 'Musang King',
    age: 5,
    plantedDate: '2021-04-18',
    location: {
      block: 'A',
      row: '04',
      position: '02',
      coordinates: { lat: 10.4590, lng: 107.2152 }
    },
    status: 'healthy',
    healthScore: 88,
    soilMoisture: 65,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 28,
    heightMeters: 4.1,
    trunkDiameterCm: 22,
    lastUpdated: '2026-09-15T07:45:00',
    lastUpdatedBy: 'Nguyễn Văn An',
    image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
    notes: 'Musang King ghép gốc nhớt phát triển tốt, màu lá xanh thẫm dày dặn.',
    history: [
      {
        id: 'h-003-1',
        date: '15/09/2026',
        time: '07:45',
        activity: 'Kiểm tra bẫy côn trùng',
        type: 'health_check',
        status: 'healthy',
        description: 'Bẫy dính vàng quanh gốc bắt được ít rầy, không có dấu hiệu sâu đục trái.',
        performer: 'Nguyễn Văn An'
      }
    ]
  },
  {
    id: 'SD-004',
    code: 'SD-004',
    variety: 'Ri6',
    age: 6,
    plantedDate: '2020-07-01',
    location: {
      block: 'A',
      row: '04',
      position: '05',
      coordinates: { lat: 10.4592, lng: 107.2155 }
    },
    status: 'monitoring',
    healthScore: 74,
    soilMoisture: 52,
    leafCondition: 'fair',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 35,
    heightMeters: 4.6,
    trunkDiameterCm: 27,
    lastUpdated: '2026-09-14T15:20:00',
    lastUpdatedBy: 'Phạm Minh Tuấn',
    image: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?auto=format&fit=crop&w=1200&q=80',
    notes: 'Phát hiện rầy xanh xuất hiện ở đọt non hướng Đông. Cần tăng ẩm và theo dõi mật độ rầy.',
    history: [
      {
        id: 'h-004-1',
        date: '14/09/2026',
        time: '15:20',
        activity: 'Kiểm tra mật độ rầy',
        type: 'health_check',
        status: 'monitoring',
        description: 'Có rầy xanh bám ở mặt dưới lá non. Đã cắm cờ vàng theo dõi khu vực Row 04.',
        performer: 'Phạm Minh Tuấn'
      },
      {
        id: 'h-004-2',
        date: '12/09/2026',
        time: '09:30',
        activity: 'Tưới nước bổ sung',
        type: 'watering',
        dosage: '25 Lít',
        description: 'Bổ sung ẩm vì đất mô cao thoát nước nhanh.',
        performer: 'Phạm Minh Tuấn'
      }
    ]
  },
  {
    id: 'SD-005',
    code: 'SD-005',
    variety: 'Ri6',
    age: 6,
    plantedDate: '2020-08-10',
    location: {
      block: 'A',
      row: '04',
      position: '08',
      coordinates: { lat: 10.4594, lng: 107.2158 }
    },
    status: 'problem',
    healthScore: 58,
    soilMoisture: 79,
    leafCondition: 'yellowing',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 22,
    heightMeters: 4.3,
    trunkDiameterCm: 25,
    lastUpdated: '2026-09-15T06:15:00',
    lastUpdatedBy: 'Lê Văn Bình',
    image: 'https://images.unsplash.com/photo-1587411768638-ec71f8e33b78?auto=format&fit=crop&w=1200&q=80',
    notes: 'Gốc có vết xì mủ nứt thân rỉ nước màu nâu (Phytophthora palmivora). Lá có biểu hiện vàng gân chính.',
    history: [
      {
        id: 'h-005-1',
        date: '15/09/2026',
        time: '06:15',
        activity: 'Điều trị nấm xì mủ gốc',
        type: 'treatment',
        status: 'problem',
        description: 'Cạo sạch vết xì mủ cách mặt đất 30cm, quét dung dịch Ridomil Gold pha đậm đặc kết hợp phun Fosetyl Aluminium.',
        performer: 'Lê Văn Bình'
      },
      {
        id: 'h-005-2',
        date: '13/09/2026',
        time: '14:00',
        activity: 'Ngắt bớt trái giảm tải',
        type: 'pruning',
        description: 'Cắt bỏ 10 trái nhỏ ở cành yếu để tập trung dinh dưỡng cứu cây.',
        performer: 'Lê Văn Bình'
      }
    ]
  },
  {
    id: 'SD-006',
    code: 'SD-006',
    variety: 'Black Thorn',
    age: 4,
    plantedDate: '2022-03-15',
    location: {
      block: 'B',
      row: '01',
      position: '03',
      coordinates: { lat: 10.4601, lng: 107.2162 }
    },
    status: 'healthy',
    healthScore: 90,
    soilMoisture: 66,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 18,
    heightMeters: 3.6,
    trunkDiameterCm: 18,
    lastUpdated: '2026-09-13T11:20:00',
    lastUpdatedBy: 'Trần Đình Trọng',
    image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1200&q=80',
    notes: 'Cây giống Black Thorn D200 năm đầu cho trái bói, chất lượng đọt rất khỏe.',
    history: [
      {
        id: 'h-006-1',
        date: '13/09/2026',
        time: '11:20',
        activity: 'Bón Amino Acid sinh học',
        type: 'fertilizing',
        dosage: 'Dung dịch pha 1:500',
        description: 'Phun qua lá dưỡng đọt và nuôi trái non.',
        performer: 'Trần Đình Trọng'
      }
    ]
  },
  {
    id: 'SD-007',
    code: 'SD-007',
    variety: 'Monthong (Dona)',
    age: 8,
    plantedDate: '2018-05-19',
    location: {
      block: 'B',
      row: '01',
      position: '09',
      coordinates: { lat: 10.4604, lng: 107.2166 }
    },
    status: 'healthy',
    healthScore: 94,
    soilMoisture: 67,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 68,
    heightMeters: 5.6,
    trunkDiameterCm: 36,
    lastUpdated: '2026-09-15T09:00:00',
    lastUpdatedBy: 'Nguyễn Văn An',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=1200&q=80',
    notes: 'Cây đầu dòng năng suất cao nhất Lô B. Trái đạt trọng lượng trung bình 2.8kg.',
    history: [
      {
        id: 'h-007-1',
        date: '15/09/2026',
        time: '09:00',
        activity: 'Kiểm tra bao trái',
        type: 'health_check',
        status: 'healthy',
        description: 'Đã bao lưới bảo vệ 68 trái tránh dơi và sóc cắn phá.',
        performer: 'Nguyễn Văn An'
      }
    ]
  },
  {
    id: 'SD-008',
    code: 'SD-008',
    variety: 'Ri6',
    age: 5,
    plantedDate: '2021-06-08',
    location: {
      block: 'B',
      row: '02',
      position: '04',
      coordinates: { lat: 10.4608, lng: 107.2170 }
    },
    status: 'monitoring',
    healthScore: 78,
    soilMoisture: 61,
    leafCondition: 'fair',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 30,
    heightMeters: 4.2,
    trunkDiameterCm: 23,
    lastUpdated: '2026-09-12T16:40:00',
    lastUpdatedBy: 'Phạm Minh Tuấn',
    image: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?auto=format&fit=crop&w=1200&q=80',
    notes: 'Cành hướng Tây bị gió giật nhẹ, đã chằng chống cành phụ.',
    history: [
      {
        id: 'h-008-1',
        date: '12/09/2026',
        time: '16:40',
        activity: 'Chống giàn đỡ cành',
        type: 'pruning',
        description: 'Dựng cọc tre chống 3 cành mang trái nặng tránh gãy khi có giông lốc.',
        performer: 'Phạm Minh Tuấn'
      }
    ]
  },
  {
    id: 'SD-009',
    code: 'SD-009',
    variety: 'Ri6',
    age: 6,
    plantedDate: '2020-09-22',
    location: {
      block: 'B',
      row: '02',
      position: '11',
      coordinates: { lat: 10.4611, lng: 107.2174 }
    },
    status: 'unknown',
    healthScore: 65,
    soilMoisture: 55,
    leafCondition: 'fair',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 26,
    heightMeters: 4.4,
    trunkDiameterCm: 24,
    lastUpdated: '2026-08-28T14:10:00',
    lastUpdatedBy: 'Hệ thống tự động',
    image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
    notes: 'Chưa kiểm tra trong 18 ngày qua. Cần kỹ thuật viên quét QR cập nhật tình trạng tại chỗ.',
    history: [
      {
        id: 'h-009-1',
        date: '28/08/2026',
        time: '14:10',
        activity: 'Ghi nhận hệ thống',
        type: 'health_check',
        status: 'unknown',
        description: 'Chưa có lượt kiểm tra thực địa trong chu kỳ 2 tuần gần nhất.',
        performer: 'Hệ thống tự động'
      }
    ]
  },
  {
    id: 'SD-010',
    code: 'SD-010',
    variety: 'Monthong (Dona)',
    age: 7,
    plantedDate: '2019-11-05',
    location: {
      block: 'C',
      row: '01',
      position: '02',
      coordinates: { lat: 10.4615, lng: 107.2178 }
    },
    status: 'healthy',
    healthScore: 91,
    soilMoisture: 69,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 48,
    heightMeters: 5.1,
    trunkDiameterCm: 30,
    lastUpdated: '2026-09-14T08:15:00',
    lastUpdatedBy: 'Nguyễn Văn An',
    image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1200&q=80',
    notes: 'Trái phát triển đồng đều, cuống trái to khỏe, không có vết cắn rệp muội.',
    history: [
      {
        id: 'h-010-1',
        date: '14/09/2026',
        time: '08:15',
        activity: 'Tưới nước & kiểm tra đất',
        type: 'watering',
        dosage: '35 Lít',
        description: 'Đo độ pH đất đạt 6.2 lý tưởng.',
        performer: 'Nguyễn Văn An'
      }
    ]
  },
  {
    id: 'SD-011',
    code: 'SD-011',
    variety: 'Musang King',
    age: 5,
    plantedDate: '2021-05-14',
    location: {
      block: 'C',
      row: '01',
      position: '07',
      coordinates: { lat: 10.4618, lng: 107.2182 }
    },
    status: 'healthy',
    healthScore: 89,
    soilMoisture: 64,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 24,
    heightMeters: 4.0,
    trunkDiameterCm: 21,
    lastUpdated: '2026-09-15T09:30:00',
    lastUpdatedBy: 'Lê Văn Bình',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=1200&q=80',
    notes: 'Cây phát đọt lần 2 đồng loạt, lá lụa chuyển bánh tẻ rất nhanh.',
    history: [
      {
        id: 'h-011-1',
        date: '15/09/2026',
        time: '09:30',
        activity: 'Bón vi lượng kẽm và magie',
        type: 'fertilizing',
        dosage: 'Bo-Canxi-Mg 50g',
        description: 'Chống rụng trái non và giúp lá xanh dày.',
        performer: 'Lê Văn Bình'
      }
    ]
  },
  {
    id: 'SD-012',
    code: 'SD-012',
    variety: 'Ri6',
    age: 6,
    plantedDate: '2020-06-25',
    location: {
      block: 'C',
      row: '02',
      position: '05',
      coordinates: { lat: 10.4622, lng: 107.2186 }
    },
    status: 'problem',
    healthScore: 52,
    soilMoisture: 84,
    leafCondition: 'poor',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 16,
    heightMeters: 4.5,
    trunkDiameterCm: 26,
    lastUpdated: '2026-09-15T07:10:00',
    lastUpdatedBy: 'Trần Đình Trọng',
    image: 'https://images.unsplash.com/photo-1587411768638-ec71f8e33b78?auto=format&fit=crop&w=1200&q=80',
    notes: 'Đất bị ngập úng cục bộ sau mưa bão. Rễ có mùi ủng chua, chóp lá bị cháy rìa.',
    history: [
      {
        id: 'h-012-1',
        date: '15/09/2026',
        time: '07:10',
        activity: 'Đào rãnh thoát nước khẩn cấp',
        type: 'treatment',
        status: 'problem',
        description: 'Khơi thông mương thoát nước quanh mô cây, rải vôi bột khử chua hạ phèn.',
        performer: 'Trần Đình Trọng'
      }
    ]
  },
  {
    id: 'SD-013',
    code: 'SD-013',
    variety: 'Chuồng Bò',
    age: 9,
    plantedDate: '2017-08-11',
    location: {
      block: 'C',
      row: '02',
      position: '10',
      coordinates: { lat: 10.4626, lng: 107.2190 }
    },
    status: 'healthy',
    healthScore: 96,
    soilMoisture: 68,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 62,
    heightMeters: 6.2,
    trunkDiameterCm: 39,
    lastUpdated: '2026-09-13T14:50:00',
    lastUpdatedBy: 'Phạm Minh Tuấn',
    image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1200&q=80',
    notes: 'Cây đại thụ trong vườn, sức đề kháng nấm bệnh tự nhiên rất tốt.',
    history: [
      {
        id: 'h-013-1',
        date: '13/09/2026',
        time: '14:50',
        activity: 'Cắt tỉa cành tăm vượt sáng',
        type: 'pruning',
        description: 'Tỉa thông thoáng lòng tán giúp ánh sáng phân bổ đều.',
        performer: 'Phạm Minh Tuấn'
      }
    ]
  },
  {
    id: 'SD-014',
    code: 'SD-014',
    variety: 'Ri6',
    age: 4,
    plantedDate: '2022-09-02',
    location: {
      block: 'C',
      row: '03',
      position: '03',
      coordinates: { lat: 10.4629, lng: 107.2194 }
    },
    status: 'monitoring',
    healthScore: 75,
    soilMoisture: 58,
    leafCondition: 'fair',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 14,
    heightMeters: 3.5,
    trunkDiameterCm: 17,
    lastUpdated: '2026-09-14T11:05:00',
    lastUpdatedBy: 'Nguyễn Văn An',
    image: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?auto=format&fit=crop&w=1200&q=80',
    notes: 'Đang theo dõi vết xước cơ học do va chạm máy kéo làm cỏ.',
    history: [
      {
        id: 'h-014-1',
        date: '14/09/2026',
        time: '11:05',
        activity: 'Bôi keo liền sẹo',
        type: 'treatment',
        status: 'monitoring',
        description: 'Vệ sinh vết thương và bôi keo Mỹ Tiến ngăn vi khuẩn xâm nhập.',
        performer: 'Nguyễn Văn An'
      }
    ]
  },
  {
    id: 'SD-015',
    code: 'SD-015',
    variety: 'Monthong (Dona)',
    age: 6,
    plantedDate: '2020-04-10',
    location: {
      block: 'C',
      row: '03',
      position: '08',
      coordinates: { lat: 10.4632, lng: 107.2198 }
    },
    status: 'healthy',
    healthScore: 93,
    soilMoisture: 71,
    leafCondition: 'good',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 50,
    heightMeters: 4.9,
    trunkDiameterCm: 29,
    lastUpdated: '2026-09-15T08:00:00',
    lastUpdatedBy: 'Lê Văn Bình',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=1200&q=80',
    notes: 'Gốc chắc khỏe, đang đi cơi đọt thứ 3 khỏe mạnh, trái to đồng đều.',
    history: [
      {
        id: 'h-015-1',
        date: '15/09/2026',
        time: '08:00',
        activity: 'Tưới nước & châm phân tự động',
        type: 'watering',
        dosage: '30 Lít',
        description: 'Tưới hệ thống qua rễ kèm humic acid cải tạo đất.',
        performer: 'Lê Văn Bình'
      }
    ]
  },
  {
    id: 'SD-016',
    code: 'SD-016',
    variety: 'Ri6',
    age: 5,
    plantedDate: '2021-08-30',
    location: {
      block: 'B',
      row: '03',
      position: '06',
      coordinates: { lat: 10.4635, lng: 107.2202 }
    },
    status: 'unknown',
    healthScore: 68,
    soilMoisture: 59,
    leafCondition: 'fair',
    flowering: false,
    fruitCondition: 'developing',
    fruitCount: 24,
    heightMeters: 4.1,
    trunkDiameterCm: 22,
    lastUpdated: '2026-08-25T16:00:00',
    lastUpdatedBy: 'Hệ thống tự động',
    image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
    notes: 'Chưa cập nhật trong hơn 20 ngày. Vị trí cuối Lô B giáp hàng rào suối.',
    history: [
      {
        id: 'h-016-1',
        date: '25/08/2026',
        time: '16:00',
        activity: 'Lần kiểm tra gần nhất',
        type: 'health_check',
        status: 'unknown',
        description: 'Được ghi nhận trước đợt mưa dầm tháng 8.',
        performer: 'Trần Đình Trọng'
      }
    ]
  }
];

export const STATUS_CONFIG = {
  healthy: {
    label: 'Khỏe mạnh',
    shortLabel: 'Khỏe',
    color: 'emerald',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    iconColor: 'text-emerald-600',
    emoji: '🟢'
  },
  monitoring: {
    label: 'Cần theo dõi',
    shortLabel: 'Theo dõi',
    color: 'amber',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badgeBg: 'bg-amber-500',
    dot: 'bg-amber-500',
    iconColor: 'text-amber-600',
    emoji: '🟡'
  },
  problem: {
    label: 'Có vấn đề',
    shortLabel: 'Vấn đề',
    color: 'rose',
    bgLight: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badgeBg: 'bg-rose-500',
    dot: 'bg-rose-500',
    iconColor: 'text-rose-600',
    emoji: '🔴'
  },
  unknown: {
    label: 'Chưa cập nhật',
    shortLabel: 'Chưa CN',
    color: 'stone',
    bgLight: 'bg-stone-100',
    border: 'border-stone-300',
    text: 'text-stone-600',
    badgeBg: 'bg-stone-400',
    dot: 'bg-stone-400',
    iconColor: 'text-stone-500',
    emoji: '⚪'
  }
};
