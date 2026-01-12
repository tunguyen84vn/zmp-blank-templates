import React, { useEffect, useState } from 'react';
import { Page, Text, Button } from 'zmp-ui';
import { useNavigate, useLocation } from 'zmp-ui';
import dayjs from 'dayjs';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [bookingId, setBookingId] = useState('N/A');
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);

  useEffect(() => {
    const stateData = location.state || {};

    if (stateData.bookingId) {
      setBookingId(stateData.bookingId);
    } else if (stateData.transId) {
      setBookingId(stateData.transId);
    }

    if (stateData.totalPrice) {
      setTotalPrice(stateData.totalPrice);
    }

    if (stateData.selectedSlots) {
      setSelectedSlots(stateData.selectedSlots);
    }

    setIsLoading(false);
  }, [location.state]);

  if (isLoading) {
    return <Page className="flex items-center justify-center">Đang xử lý...</Page>;
  }

  return (
    <Page className="p-6">
      <div className="text-center mb-8">
        <Text.Title className="text-3xl font-bold text-green-600 mb-4">
          Đặt sân thành công!
        </Text.Title>
        <Text className="text-lg text-gray-700 mb-6">
          Cảm ơn bạn đã tin tưởng PES Pickleball. Chúng tôi đã gửi mã xác nhận và QR check-in qua tin nhắn Zalo.
        </Text>

        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <Text className="font-semibold text-gray-800">
            Mã đơn đặt sân: <span className="text-indigo-600">{bookingId}</span>
          </Text>
        </div>

        {totalPrice > 0 && (
          <Text className="text-xl font-bold text-indigo-700 mb-6">
            Tổng thanh toán: {totalPrice.toLocaleString('vi-VN')}đ
          </Text>
        )}

        {selectedSlots.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
            <Text className="font-semibold mb-3">Các khung giờ đã đặt:</Text>
            {selectedSlots.map((slot: any, index: number) => (
              <div key={index} className="mb-2">
                <Text className="font-medium">
                  {dayjs(slot.date).format('DD/MM/YYYY')} - {slot.time}
                </Text>
                <Text className="text-sm text-gray-600">
                  {slot.price.toLocaleString('vi-VN')}đ
                </Text>
              </div>
            ))}
          </div>
        )}

        <div className="mb-8">
          <Text.Title className="text-xl font-semibold text-gray-800 mb-2">
            Địa chỉ sân: PES Pickleball Center
          </Text.Title>
          <Text className="text-gray-600">
            123 Đường ABC, Quận 1, TP. Hồ Chí Minh
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            (Vui lòng kiểm tra tin nhắn Zalo để xác nhận địa chỉ chính xác)
          </Text>
        </div>

        <div className="space-y-6 mb-8">
          <div className="bg-white shadow-md rounded-xl p-6">
            <Text.Title className="text-xl font-semibold text-indigo-800 mb-4">
              Quy định sân
            </Text.Title>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Không mang thức ăn, đồ uống có cồn lên sân.</li>
              <li>Giữ gìn vệ sinh chung, tôn trọng người chơi khác.</li>
              <li>Check-in trước 10 phút so với giờ bắt đầu.</li>
              <li>Mang theo CMND/CCCD nếu cần xác minh.</li>
            </ul>
          </div>

          <div className="bg-white shadow-md rounded-xl p-6">
            <Text.Title className="text-xl font-semibold text-indigo-800 mb-4">
              Hướng dẫn check-in
            </Text.Title>
            <div className="space-y-4 text-gray-700">
              <div>
                <Text className="font-semibold">Quét QR check-in</Text>
                <Text className="text-sm">Mở Zalo → Quét QR code trong tin nhắn xác nhận (hoặc trong lịch sử đặt sân).</Text>
              </div>
              <div>
                <Text className="font-semibold">Thời gian check-in</Text>
                <Text className="text-sm">Trước 10 phút so với giờ bắt đầu. Check-in muộn có thể mất slot.</Text>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Button color="primary" fullWidth onClick={() => navigate('/my-bookings')}>
            Xem lịch đặt sân của tôi
          </Button>
          <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
            Quay về trang chủ
          </Button>
        </div>
      </div>
    </Page>
  );
};

export default SuccessPage;