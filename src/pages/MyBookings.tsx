import React, { useEffect, useState } from 'react';
import { Page, Text, List, Button, Icon } from 'zmp-ui';
import { useNavigate } from 'zmp-ui';
import dayjs from 'dayjs';
import { showToast } from 'zmp-sdk/apis';

interface Slot {
  date: string;
  time: string;
  price: number;
}

interface Booking {
  booking_id: string;
  selectedSlots: Slot[];
  totalPrice: number;
  created_at: string;
}

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Hardcode tạm userId để test (giống SummaryPage)
  const userId = '3368637342326461234'; // Thay bằng giá trị thực tế khi production

  useEffect(() => {
    const fetchBookings = async () => {
      if (!userId) {
        showToast({ message: 'Không tìm thấy thông tin user' });
        setIsLoading(false);
        return;
      }

      try {
        console.log('Calling API my-bookings with userId:', userId); // Log để debug

        const response = await fetch(`https://pes-pickleball-backend.vercel.app/api/my-bookings?userId=${userId}`);
        const result = await response.json();

        console.log('API response:', result); // Log để kiểm tra response

        if (result.success) {
          setBookings(result.bookings || []);
        } else {
          showToast({ message: 'Không tìm thấy đơn hàng' });
        }
      } catch (err) {
        console.error('Fetch bookings error:', err);
        showToast({ message: 'Lỗi tải lịch đặt sân' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (isLoading) {
    return (
      <Page className="flex items-center justify-center h-screen">
        <Text>Đang tải lịch đặt sân...</Text>
      </Page>
    );
  }

  return (
    <Page className="p-4">
      <Text.Title className="text-2xl font-bold text-indigo-800 mb-6">
        Lịch đặt sân của tôi
      </Text.Title>

      {bookings.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <Text>Bạn chưa có đơn đặt sân nào.</Text>
        </div>
      ) : (
        <List>
          {bookings.map((booking) => (
            <div key={booking.booking_id} className="mb-8 bg-white shadow-md rounded-xl p-6">
              <Text.Title className="text-lg font-semibold mb-2">
                Mã đơn: {booking.booking_id}
              </Text.Title>
              <Text className="text-sm text-gray-600 mb-2">
                Ngày đặt: {dayjs(booking.created_at).format('DD/MM/YYYY HH:mm')}
              </Text>
              <Text className="text-sm text-gray-600 mb-4 font-medium">
                Tổng: {booking.totalPrice.toLocaleString('vi-VN')}đ
              </Text>

              {/* Danh sách slot */}
              <div className="mt-4">
                {booking.selectedSlots.map((slot, index) => (
                  <div key={index} className="mb-2">
                    <Text className="font-medium">
                      {dayjs(slot.date).format('DD/MM/YYYY')} - {slot.time}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {slot.price.toLocaleString('vi-VN')}đ
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </List>
      )}

      <div className="mt-8">
        <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
          Quay về trang chủ
        </Button>
      </div>
    </Page>
  );
};

export default MyBookings;