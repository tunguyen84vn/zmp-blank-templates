import React, { useEffect, useState } from 'react';
import { Page, Text, Icon, Spinner, Button, Box, List } from 'zmp-ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken } from 'zmp-sdk/apis'; 

const CheckInPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading');
  const [errorCode, setErrorCode] = useState<string>(''); // Lưu mã lỗi để hiển thị hướng dẫn
  const [message, setMessage] = useState('Đang kết nối hệ thống...');
  
  const location = useLocation();
  const navigate = useNavigate();

  // Hàm xử lý check-in
  const processCheckIn = async () => {
    setStatus('loading');
    setMessage('Đang xác thực danh tính...');
    setErrorCode('');

    try {
      // 1. Lấy thông tin từ URL và Zalo SDK
      const searchParams = new URLSearchParams(location.search);
      const courtId = searchParams.get('courtId') || '1';
      
      const accessToken = await getAccessToken({}); // Token định danh người dùng

      // 2. Gọi API Backend
      const res = await fetch('https://pes-pickleball-backend.vercel.app/api/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, courtId })
      });

      const data = await res.json();

      // 3. Xử lý kết quả
      if (data.success) {
          setStatus('success');
          setMessage(data.message);
      } else {
          setStatus('fail');
          setErrorCode(data.code || 'UNKNOWN'); // Lưu mã lỗi (VD: NO_BOOKING)
          setMessage(data.error || 'Lỗi không xác định');
      }

    } catch (err: any) {
      console.error(err);
      setStatus('fail');
      setErrorCode('NETWORK_ERROR');
      setMessage('Lỗi kết nối mạng. Vui lòng thử lại.');
    }
  };

  // Gọi hàm check-in ngay khi vào trang
  useEffect(() => {
    processCheckIn();
  }, []);

  // --- COMPONENT: HIỂN THỊ HƯỚNG DẪN KHI GẶP LỖI ---
  const renderErrorInstruction = () => {
    // Trường hợp 1: Không tìm thấy lịch đặt (Sai tài khoản hoặc sai ngày)
    if (errorCode === 'NO_BOOKING') {
      return (
        <Box className="bg-orange-50 p-4 rounded-lg mt-4 border border-orange-200 text-left">
          <Text.Title size="small" className="text-orange-700 mb-2 font-bold">
            💡 Gợi ý khắc phục:
          </Text.Title>
          <List>
            <div className="flex gap-3 mb-3 items-start">
              <Icon icon="zi-user-solid" className="text-orange-500 mt-1" />
              <div className="flex-1">
                <Text size="small" className="font-semibold text-gray-700">Sai tài khoản Zalo?</Text>
                <Text size="xxSmall" className="text-gray-500">
                  Vui lòng kiểm tra xem bạn có đang dùng đúng tài khoản Zalo đã đặt sân không.
                </Text>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Icon icon="zi-calendar-solid" className="text-orange-500 mt-1" />
              <div className="flex-1">
                <Text size="small" className="font-semibold text-gray-700">Nhầm ngày?</Text>
                <Text size="xxSmall" className="text-gray-500">
                  Hệ thống chỉ mở cổng cho lịch đặt của ngày hôm nay.
                </Text>
              </div>
            </div>
          </List>
        </Box>
      );
    }

    // Trường hợp 2: Sai khung giờ (Đến quá sớm hoặc quá trễ)
    if (errorCode === 'WRONG_TIME') {
      return (
        <Box className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-200 text-left">
          <Text.Title size="small" className="text-blue-700 mb-2 font-bold">
            ⏰ Quy định giờ vào sân:
          </Text.Title>
          <List>
            <div className="flex gap-3 mb-3 items-start">
              <Icon icon="zi-clock-1" className="text-blue-500 mt-1" />
              <div className="flex-1">
                <Text size="small" className="font-semibold text-gray-700">Sớm nhất:</Text>
                <Text size="xxSmall" className="text-gray-500">
                  Bạn được vào trước <b>60 phút</b> so với giờ bắt đầu.
                </Text>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Icon icon="zi-clock-2" className="text-blue-500 mt-1" />
              <div className="flex-1">
                <Text size="small" className="font-semibold text-gray-700">Muộn nhất:</Text>
                <Text size="xxSmall" className="text-gray-500">
                  Cổng vẫn mở cho đến khi <b>hết giờ</b> thuê sân.
                </Text>
              </div>
            </div>
          </List>
          <Text size="xxSmall" className="text-gray-500 mt-3 italic text-center">
            (Ví dụ: Đặt 18h-20h. Bạn có thể check-in từ 17h00 đến 19h59)
          </Text>
        </Box>
      );
    }

    return null;
  };

  // --- RENDER GIAO DIỆN CHÍNH ---
  return (
    <Page className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
      
      {/* 1. TRẠNG THÁI LOADING */}
      {status === 'loading' && (
        <Box className="flex flex-col items-center">
            <Spinner visible logo="https://stc-zalotech.zg.vn/static/media/zalo-icon.7d5743b1.svg" />
            <Text className="mt-4 text-gray-500 font-medium animate-pulse">Đang kết nối cổng thông minh...</Text>
        </Box>
      )}
      
      {/* 2. TRẠNG THÁI THÀNH CÔNG */}
      {status === 'success' && (
        <div className="text-center w-full animate-fadeIn">
            <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Icon icon="zi-unlock-solid" className="text-green-600 text-5xl"/>
            </div>
            <Text.Title className="text-green-600 text-2xl font-bold mb-2">MỞ CỔNG THÀNH CÔNG</Text.Title>
            <Text className="text-gray-600 mb-6 font-medium">{message}</Text>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
                <Text size="small" className="text-gray-500 leading-5">
                    💡 <b>Mẹo:</b> Nếu bạn bè đến sau, bạn chỉ cần ra cổng và quét mã này một lần nữa để mở cửa cho họ.
                </Text>
            </div>

            <Button className="mt-8 w-full shadow-lg" size="large" onClick={() => navigate('/')}>
                Về Trang Chủ
            </Button>
        </div>
      )}

      {/* 3. TRẠNG THÁI THẤT BẠI */}
      {status === 'fail' && (
        <div className="w-full animate-fadeIn">
            <div className="text-center mb-6">
                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Icon icon="zi-close" className="text-red-500 text-5xl"/>
                </div>
                <Text.Title className="text-red-600 text-xl font-bold">KHÔNG THỂ VÀO SÂN</Text.Title>
                <Text className="text-gray-800 font-medium mt-2 px-4">{message}</Text>
            </div>

            {/* Hiển thị bảng hướng dẫn (Troubleshooting) */}
            {renderErrorInstruction()}

            <div className="flex gap-3 mt-8">
                <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
                    Về trang chủ
                </Button>
                <Button variant="primary" fullWidth onClick={processCheckIn}>
                    Thử lại
                </Button>
            </div>
        </div>
      )}
    </Page>
  );
};

export default CheckInPage;