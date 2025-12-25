import React from 'react';
import { Page, List, Button, Text, Icon } from 'zmp-ui';
import { useNavigate, useLocation } from 'zmp-ui'; // Hoặc từ zmp-sdk nếu cần
import dayjs from 'dayjs';

interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
}

const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Lấy selectedSlots từ state (khi navigate từ HomePage)
  const selectedSlots: Slot[] = (location.state as any)?.selectedSlots || [];

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

  // Nhóm slots theo ngày
  const groupedByDate = selectedSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const totalSlots = selectedSlots.length;
  const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

  return (
    <Page className="bg-gray-50 min-h-screen">
      <div className="p-4 pb-24">
        {/* Header */}
        <Text.Title className="text-center text-2xl font-bold mb-6 text-blue-800">
          Xác nhận đặt sân Pickleball
        </Text.Title>

        {/* Thông tin sân - dùng div thay Card */}
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
          Các khung giờ đã chọn ({totalSlots} slot)
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
                      <Text className="font-medium text-green-600">
                        {slot.price.toLocaleString('vi-VN')}đ
                      </Text>
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
          onClick={() => {
            // TODO: Gọi API backend để tạo đơn + thanh toán VNPay
            alert('Đang chuyển sang thanh toán VNPay...\n(Tích hợp thực tế sẽ gọi API)');
          }}
          className="flex-1"
        >
          Xác nhận & Thanh toán
        </Button>
      </div>
    </Page>
  );
};

export default SummaryPage;