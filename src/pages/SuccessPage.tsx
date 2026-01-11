import React, { useEffect, useState } from 'react';
import { Page, Text, Button, List, Icon } from 'zmp-ui';
import { useNavigate, useLocation } from 'zmp-ui';
import dayjs from 'dayjs';

interface Slot {
  date: string;
  time: string;
  price: number;
}

const SUCCESS_DATA_KEY = 'pes_success_data';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({ transId: 'N/A', totalPrice: 0, selectedSlots: [] });

  useEffect(() => {
    let fetchedData = location.state || {};

    // Bước 1: Đọc từ state
    if (!fetchedData.selectedSlots || fetchedData.selectedSlots.length === 0) {
      // Bước 2: Đọc từ localStorage nếu state rỗng
      const stored = localStorage.getItem(SUCCESS_DATA_KEY);
      if (stored) {
        try {
          fetchedData = JSON.parse(stored);
          // Delay xóa 1 phút phòng reload
          setTimeout(() => localStorage.removeItem(SUCCESS_DATA_KEY), 60000);
        } catch (e) {
          console.error('Lỗi parse success data từ localStorage:', e);
        }
      }
    }

    // Bước 3: Nếu vẫn rỗng, fallback fetch từ backend nếu có transId
    if (!fetchedData.selectedSlots || fetchedData.selectedSlots.length === 0) {
      const transId = fetchedData.transId || location.state?.transId || 'N/A';
      if (transId !== 'N/A') {
        fetchBookingFromBackend(transId);
        return; // Đợi fetch xong rồi set loading false
      }
    }

    // Nếu có data từ client, update state và tắt loading
    setData(fetchedData);
    setIsLoading(false);

    // Debug log
    console.log('SuccessPage loaded:', {
      fromState: location.state ? 'Có state' : 'Không có state',
      fromStorage: localStorage.getItem(SUCCESS_DATA_KEY) ? 'Có data storage' : 'Không có storage',
      selectedSlotsLength: fetchedData.selectedSlots?.length || 0,
      selectedSlotsSample: fetchedData.selectedSlots?.slice(0, 3) || [],
      totalPrice: fetchedData.totalPrice || 0,
    });
  }, [location.state]);

  const fetchBookingFromBackend = async (transId: string) => {
    try {
      const response = await fetch(`https://pes-pickleball-backend.vercel.app/api/get-booking?transId=${transId}`);
      const bookingData = await response.json();
      if (bookingData.success) {
        setData({
          transId,
          totalPrice: bookingData.totalPrice,
          selectedSlots: bookingData.selectedSlots,
        });
        console.log('Fetch từ backend thành công:', bookingData);
      } else {
        console.warn('Không tìm thấy chi tiết từ server, vui lòng kiểm tra lại.');
      }
    } catch (err) {
      console.error('Lỗi fetch booking từ backend:', err);
      console.error('Lỗi kết nối server, vui lòng kiểm tra lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const transId = data.transId || 'N/A';
  const totalPrice = data.totalPrice || 0;
  const selectedSlots = data.selectedSlots || [];

  const totalSlots = selectedSlots.length;

  const groupedByDate = selectedSlots.reduce((acc: Record<string, Slot[]>, slot: any) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Page className="flex flex-col items-center justify-center h-full bg-green-50">
        <Icon icon="zi-check" className="text-blue-600 text-6xl animate-spin mb-4" />
        <Text className="text-lg text-gray-600">Đang tải chi tiết đặt sân...</Text>
      </Page>
    );
  }

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