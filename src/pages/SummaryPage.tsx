import React from 'react';
import { Page, List, Button, Text, Icon } from 'zmp-ui';
import { useNavigate } from 'zmp-ui';
import dayjs from 'dayjs';

import { showToast, getUserInfo, Payment } from 'zmp-sdk/apis';

import { useAtom } from 'jotai';
import { selectedSlotsAtom } from '../store/cart';

interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
}

const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  
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

  const groupedByDate = selectedSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const totalSlots = selectedSlots.length;
  const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

  const removeSlot = (removedSlot: Slot) => {
    const updatedSlots = selectedSlots.filter(s => !(s.id === removedSlot.id && s.date === removedSlot.date));
    setSelectedSlots(updatedSlots);
    showToast({ message: 'Đã bỏ slot!' });
    if (updatedSlots.length === 0) {
      showToast({ message: 'Giỏ hàng rỗng, quay về chọn lại!' });
      navigate(-1);
    }
  };

  const handlePayment = async () => {
    try {

      const userId = '3368637342326461234'; // Hardcode tạm (lấy từ log trước)
      const phone = '0901234567';
      const name = 'User Name';

      if (!userId) {
        showToast({ message: 'Vui lòng đăng nhập Zalo!' });
        return;
      }

      const orderId = globalThis.crypto.randomUUID(); // Sinh orderId

      // Gọi backend để sinh mac
      const response = await fetch('https://pes-pickleball-backend.vercel.app/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phone,
          name,
          selectedSlots,
          amount: totalPrice,
          desc: 'Đặt sân Pickleball',
          orderId
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Create order failed');

      const { mac } = data;

      // Gọi SDK Comprehensive (createOrder)
      Payment.createOrder({
        desc: 'Đặt sân Pickleball',
        item: selectedSlots.map(slot => ({
          id: slot.id.toString(),
          amount: slot.price
        })),
        amount: totalPrice,
        extradata: JSON.stringify({
          userId,
          phone,
          name,
          notes: 'Extra data'
        }),
        method: JSON.stringify({
          id: "VNPAY_SANDBOX",
          isCustom: false
        }),
        mac,
        success: (res) => {
          showToast({ message: 'Tạo đơn hàng thành công! Đang chuyển thanh toán...' });
          setSelectedSlots([]); // Reset giỏ
          navigate('/success');
        },
        fail: (err) => {
          showToast({ message: 'Tạo đơn hàng thất bại!' });
        }
      });
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

        {/* Thông tin sân */}
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

        {/* Danh sách slot */}
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

        {/* Tổng kết */}
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

        {/* Lưu ý */}
        <Text className="text-sm text-gray-500 text-center mb-6">
          Vui lòng kiểm tra kỹ thông tin trước khi thanh toán. Hệ thống sẽ gửi mã xác nhận qua tin nhắn sau khi thanh toán thành công.
        </Text>
      </div>

      {/* Nút fixed bottom */}
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