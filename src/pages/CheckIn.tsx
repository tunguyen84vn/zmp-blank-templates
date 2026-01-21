import React, { useEffect, useState } from 'react';
import { Page, Text, Icon, Button, Box, Header, useNavigate, useLocation } from 'zmp-ui';
import { getAccessToken, showToast } from 'zmp-sdk/apis'; 
import dayjs from 'dayjs';

const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Nhận dữ liệu từ trang MyBookings truyền sang
  const { bookingId, slotInfo } = location.state || {};

  // Các trạng thái của quá trình Check-in
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'fail'>('idle');
  const [message, setMessage] = useState('');

  // Nếu người dùng vào trang này mà không có dữ liệu (vd: vào trực tiếp), hiển thị mặc định
  useEffect(() => {
    if (!bookingId || !slotInfo) {
        setStatus('fail');
        setMessage('Không tìm thấy thông tin vé. Vui lòng quay lại danh sách.');
    }
  }, [bookingId, slotInfo]);

  // Hàm gọi API mở cổng
  const handleConfirmCheckIn = async () => {
    setStatus('loading');
    
    try {
      const accessToken = await getAccessToken({}); // Xác thực user
      
      // Gọi API Backend
      // Lưu ý: Backend cần xử lý việc nhận bookingId và mở cổng tương ứng
      const res = await fetch('https://pes-pickleball-backend.vercel.app/api/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              accessToken, 
              bookingId: bookingId,
              // courtId: '1' // Nếu slotInfo có thông tin sân thì truyền vào, không thì backend tự dò
          })
      });

      const data = await res.json();

      if (data.success) {
          setStatus('success');
      } else {
          setStatus('fail');
          setMessage(data.error || 'Check-in thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error(error);
      setStatus('fail');
      setMessage('Lỗi kết nối mạng. Kiểm tra internet của bạn.');
    }
  };

  // --- RENDER GIAO DIỆN ---

  const renderContent = () => {
    if (status === 'success') {
        return (
            <div className="text-center animate-fadeIn">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon icon="zi-check" className="text-green-600 text-5xl" />
                </div>
                <Text.Title className="text-xl font-bold text-green-700 mb-2">CHECK-IN THÀNH CÔNG</Text.Title>
                <Text className="text-gray-600 mb-6">Cổng đã mở! Chúc bạn có buổi chơi vui vẻ.</Text>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-left">
                    <Text className="text-xs text-gray-500 uppercase font-bold">Thời gian chơi</Text>
                    <Text className="text-lg font-semibold text-blue-600">{slotInfo?.time}</Text>
                </div>

                <Button fullWidth onClick={() => navigate('/')}>Về trang chủ</Button>
            </div>
        );
    }

    if (status === 'fail') {
        return (
            <div className="text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon icon="zi-close" className="text-red-600 text-5xl" />
                </div>
                <Text.Title className="text-xl font-bold text-red-600 mb-2">RẤT TIẾC</Text.Title>
                <Text className="text-gray-600 mb-6">{message}</Text>
                <Button fullWidth onClick={() => navigate('/my-bookings')}>Quay lại danh sách</Button>
            </div>
        );
    }

    // Trạng thái mặc định (Idle) hoặc Loading
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="text-center mt-4">
                <Text.Title className="text-xl font-bold text-gray-800 mb-1">Xác Nhận Check-in</Text.Title>
                <Text className="text-gray-500 text-sm">Vui lòng xác nhận thông tin trước khi vào sân</Text>
                
                {/* Card thông tin vé */}
                <div className="mt-8 bg-white border border-blue-200 shadow-lg shadow-blue-50 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                    
                    <div className="flex justify-between items-center mb-4 border-b border-dashed border-gray-200 pb-4">
                        <span className="text-gray-500 text-sm">Ngày chơi</span>
                        <span className="font-bold text-gray-800">{slotInfo ? dayjs(slotInfo.date).format('DD/MM/YYYY') : '--'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Giờ bắt đầu</span>
                        <span className="font-bold text-blue-600 text-xl">{slotInfo?.time.split('h')[0]}:00</span>
                    </div>
                </div>
            </div>

            <div className="pb-6">
                <Button 
                    fullWidth 
                    size="large"
                    loading={status === 'loading'}
                    onClick={handleConfirmCheckIn}
                    className="mb-3 bg-blue-600 shadow-xl shadow-blue-200"
                >
                    {status === 'loading' ? 'Đang mở cổng...' : 'Mở Cổng Ngay'}
                </Button>
                <Button variant="tertiary" fullWidth onClick={() => navigate(-1)}>Hủy bỏ</Button>
            </div>
        </div>
    );
  };

  return (
    <Page className="bg-white flex flex-col h-screen">
      <Header title="Check-in Vào Sân" showBackIcon={true} />
      <div className="flex-1 p-6">
        {renderContent()}
      </div>
    </Page>
  );
};

export default CheckInPage;