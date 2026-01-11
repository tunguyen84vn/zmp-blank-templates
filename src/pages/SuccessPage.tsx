import React from 'react';
import { Page, Text, Button, List, Icon } from 'zmp-ui';
import { useNavigate, useLocation } from 'zmp-ui';
import dayjs from 'dayjs';

interface Slot {
  date: string;
  time: string;
  price: number;
}

const SELECTED_SLOTS_KEY = 'pes_selected_slots_temp';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  let { transId = 'N/A', totalPrice = 0, selectedSlots = [] } = location.state || {};

  // Nếu state không có selectedSlots (có thể bị mất do navigation), đọc từ localStorage
  if (selectedSlots.length === 0) {
    const stored = localStorage.getItem(SELECTED_SLOTS_KEY);
    if (stored) {
      try {
        selectedSlots = JSON.parse(stored);
        totalPrice = selectedSlots.reduce((sum: number, slot: Slot) => sum + slot.price, 0);
        // Xóa sau khi sử dụng để tránh lưu dư
        localStorage.removeItem(SELECTED_SLOTS_KEY);
      } catch (e) {
        console.error('Lỗi parse selectedSlots từ localStorage:', e);
      }
    }
  }

  const totalSlots = selectedSlots.length;

  // Group by date
  const groupedByDate = selectedSlots.reduce((acc: Record<string, Slot[]>, slot: any) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <Page className="bg-green-50 min-h-screen p-6">
      <Icon icon="zi-check-circle" className="text-green-600 text-8xl mb-4 animate-bounce mx-auto" />
      <Text.Title className="text-3xl font-bold text-green-800 mb-2 text-center">
        Đặt sân thành công!
      </Text.Title>
      <Text className="text-gray-700 text-lg mb-6 text-center">
        Cảm ơn bạn đã tin tưởng PES Pickleball. Chúng tôi đã gửi mã xác nhận và QR check-in qua tin nhắn Zalo.
      </Text>

      <div className="w-full bg-white shadow-lg rounded-xl p-6 mb-8">
        <Text.Title className="text-xl font-semibold text-blue-800 mb-4">
          Chi tiết đặt sân
        </Text.Title>
        {totalSlots > 0 ? (
          <List divider>
            {Object.entries(groupedByDate).map(([date, slots]: [string, any[]]) => (
              <List.Item key={date}>
                <div>
                  <Text className="font-semibold text-gray-800">Ngày {dayjs(date).format('DD/MM/YYYY')}</Text>
                  <ul className="list-disc pl-6 mt-2 text-sm text-gray-600">
                    {slots.map((slot, index) => (
                      <li key={index}>{slot.time} - {slot.price.toLocaleString('vi-VN')}đ</li>
                    ))}
                  </ul>
                </div>
              </List.Item>
            ))}
            <List.Item title="Số slot" subTitle={`${totalSlots} slot`} />
            <List.Item title="Tổng thanh toán" subTitle={`${totalPrice.toLocaleString('vi-VN')}đ`} />
            <List.Item title="Mã giao dịch" subTitle={transId} />
            <List.Item title="Trạng thái" subTitle="Đã thanh toán thành công" prefix={<Icon icon="zi-check" className="text-green-600" />} />
          </List>
        ) : (
          <Text className="text-center text-gray-600">
            Không tìm thấy thông tin chi tiết đặt sân. Vui lòng kiểm tra lịch sử đặt sân.
          </Text>
        )}
      </div>

      <div className="w-full bg-white shadow-lg rounded-xl p-6 mb-8">
        <Text.Title className="text-xl font-semibold text-red-800 mb-4">
          Nội quy sân Pickleball
        </Text.Title>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>Hủy trước 24 giờ: Hoàn tiền 100%.</li>
          <li>Hủy trong vòng 24 giờ hoặc không đến: Không hoàn tiền.</li>
          <li>Đến muộn quá 15 phút: Có thể mất slot mà không hoàn tiền.</li>
          <li>Mang giày thể thao sạch, không để lại rác trên sân.</li>
          <li>Không mang thức ăn, đồ uống có cồn lên sân.</li>
          <li>Giữ gìn vệ sinh chung, tôn trọng người chơi khác.</li>
        </ul>
      </div>

      <div className="w-full bg-white shadow-lg rounded-xl p-6 mb-8">
        <Text.Title className="text-xl font-semibold text-indigo-800 mb-4">
          Hướng dẫn check-in
        </Text.Title>
        <div className="space-y-4 text-gray-700">
          <div className="flex items-start">
            <div>
              <Text className="font-semibold">Quét QR check-in</Text>
              <Text className="text-sm">Mở Zalo → Quét QR code trong tin nhắn xác nhận (hoặc trong lịch sử đặt sân).</Text>
            </div>
          </div>
          <div className="flex items-start">
            <div>
              <Text className="font-semibold">Thời gian check-in</Text>
              <Text className="text-sm">Check-in trước 10 phút so với giờ bắt đầu. Check-in muộn có thể mất slot.</Text>
            </div>
          </div>
          <div className="flex items-start">
            <div>
              <Text className="font-semibold">Lưu ý</Text>
              <Text className="text-sm">Mang theo CMND/CCCD hoặc giấy tờ tùy thân nếu cần xác minh. Không check-in hộ người khác.</Text>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <Button color="primary" fullWidth onClick={() => navigate('/')}>
          Quay về trang chủ
        </Button>
        <Button variant="secondary" fullWidth onClick={() => navigate('/my-bookings')}>
          Xem lịch đặt sân của tôi
        </Button>
      </div>
    </Page>
  );
};

export default SuccessPage;