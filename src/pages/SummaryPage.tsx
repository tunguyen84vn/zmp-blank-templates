import React from 'react';
import { Page, List, Button, Text, Icon } from 'zmp-ui';
import { useNavigate } from 'zmp-ui';
import dayjs from 'dayjs';

// Import showToast and getUserInfo
import { showToast, getUserInfo } from 'zmp-sdk/apis';

// Import Jotai to update global cart
import { useAtom } from 'jotai';
import { selectedSlotsAtom } from '../store/cart'; // Adjust path if needed

interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
}

const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Use global atom for real-time cart
  const [selectedSlots, setSelectedSlots] = useAtom(selectedSlotsAtom);

  if (selectedSlots.length === 0) {
    return (
      <Page className="flex flex-col items-center justify-center h-full bg-gray-50">
        <Text className="text-xl font-semibold text-gray-600 mb-4">
          Không có slot nào được chọn
        </Text>
        <Button color="primary" onClick={() => navigate(-1)}>
          Quay lại chọn slot
        </Button>
      </Page>
    );
  }

  // Group slots by date
  const groupedByDate = selectedSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const totalSlots = selectedSlots.length;
  const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

  // Function to remove slot
  const removeSlot = (removedSlot: Slot) => {
    const updatedSlots = selectedSlots.filter(s => !(s.id === removedSlot.id && s.date === removedSlot.date));
    setSelectedSlots(updatedSlots);
    showToast({ message: 'Đã bỏ slot!' });
    if (updatedSlots.length === 0) {
      showToast({ message: 'Giỏ hàng rỗng, quay về chọn lại!' });
      navigate(-1);
    }
  };

  // Payment handler: Get user info, create order on backend, redirect to VNPay URL
  const handlePayment = async () => {
    try {
      // Get user info from Zalo
      const userResponse = await getUserInfo({});
      console.log('User info from Zalo:', userResponse); // Debug

      // Lấy userId từ userInfo.id (theo log của bạn)
      const userInfo = userResponse.userInfo || {};
      const userId = userInfo.id; // Dùng 'id' thay vì 'userId'
      const phone = ''; // Phone không có sẵn trong UserInfo
      const name = userInfo.name || 'Unknown';

      if (!userId) {
        throw new Error('Không lấy được userId từ Zalo. Vui lòng đăng nhập lại.');
      }

      const payload = {
        userId,
        phone,
        name,
        selectedSlots,
        guestUserIds: []
      };
      console.log('Sending payload to backend:', payload);

      const response = await fetch('https://pes-pickleball-backend.vercel.app/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Backend response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Create order failed');
      }

      const paymentUrl = data.paymentUrl;
      window.location.href = paymentUrl; // Redirect to VNPay
    } catch (err) {
      console.error('Payment error:', err);
      showToast({ message: 'Lỗi thanh toán, thử lại!' });
    }
  };

  return (
    <Page className="bg-gray-50 min-h-screen">
      <div className="p-4 pb-24">
        {/* Header */}
        <Text.Title className="text-center text-2xl font-bold mb-6 text-blue-800">
          Xác nhận đặt sân Pickleball
        </Text.Title>

        {/* Venue info */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center mb-3">
            <Icon icon="zi-location-solid" className="text-blue-600 mr-3 text-2xl" />
            <Text.Title className="text-lg font-semibold">PES Pickleball - Quận 7</Text.Title>
          </div>
          <Text className="text-gray-700 mb-2">
            Địa chỉ: 123 Đường Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM
          </Text>
          <Text className="text-sm text-gray-500">
            Quy định: Hủy trước 24h được hoàn 100%, sau 24h không hoàn tiền. Vui lòng đến đúng giờ.
          </Text>
        </div>

        {/* Slot list with remove button */}
        <Text.Title className="font-bold text-lg mb-3 text-gray-800">
          Các khung giờ đã chọn ({totalSlots} slot) – Bỏ nếu không cần
        </Text.Title>

        {Object.entries(groupedByDate)
          .sort(([dateA], [dateB]) => dayjs(dateA).diff(dayjs(dateB)))
          .map(([date, slots]) => (
            <div key={date} className="bg-white rounded-xl shadow-sm p-4 mb-5">
              <Text.Title className="font-semibold text-base mb-3 text-blue-700">
                {dayjs(date).format('dddd, DD/MM/YYYY')}
              </Text.Title>
              <List divider>
                {slots.map((slot, index) => (
                  <List.Item key={index}>
                    <div className="flex justify-between items-center py-1">
                      <Text className="text-gray-800">{slot.time}</Text>
                      <div className="flex items-center">
                        <Text className="font-medium text-green-600 mr-4">
                          {slot.price.toLocaleString('vi-VN')}đ
                        </Text>
                        <Button
                          variant="tertiary"
                          size="small"
                          icon={<Icon icon="zi-close" />}
                          onClick={() => removeSlot(slot)}
                        >
                          Bỏ
                        </Button>
                      </div>
                    </div>
                  </List.Item>
                ))}
              </List>
            </div>
          ))}

        {/* Total */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <Text.Title className="text-lg font-semibold text-gray-800">Tổng thanh toán</Text.Title>
              <Text className="text-sm text-gray-600">({totalSlots} slot)</Text>
            </div>
            <Text.Title className="text-2xl font-bold text-indigo-700">
              {totalPrice.toLocaleString('vi-VN')}đ
            </Text.Title>
          </div>
        </div>

        {/* Note */}
        <Text className="text-sm text-gray-500 text-center mb-6">
          Vui lòng kiểm tra kỹ thông tin trước khi thanh toán. Hệ thống sẽ gửi mã xác nhận qua tin nhắn sau khi thanh toán thành công.
        </Text>
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex gap-4 z-10">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate(-1)}
          className="flex-1"
        >
          Quay lại chỉnh sửa
        </Button>
        <Button
          color="primary"
          fullWidth
          onClick={handlePayment}
          className="flex-1"
        >
          Xác nhận & Thanh toán
        </Button>
      </div>
    </Page>
  );
};

export default SummaryPage;