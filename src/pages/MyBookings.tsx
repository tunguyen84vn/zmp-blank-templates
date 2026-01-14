import React, { useEffect, useState } from 'react';
import { Page, Text, List, Button } from 'zmp-ui';
import { useNavigate } from 'zmp-ui';
import dayjs from 'dayjs';
import { showToast } from 'zmp-sdk/apis';
import { useAtomValue } from 'jotai';
import { userAtom } from '../store/cart'; // Lấy user từ store

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
  const user = useAtomValue(userAtom); // Lấy thông tin user hiện tại
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      // Nếu chưa có ID (chưa load xong từ trang chủ), hiển thị loading
      if (!user.id) {
        // Có thể user refresh trang này trực tiếp, cần đợi hoặc xử lý logic load user lại
        // Ở đây giả định user đi từ HomePage sang
        setIsLoading(false); 
        return;
      }

      try {
        const response = await fetch(`https://pes-pickleball-backend.vercel.app/api/my-bookings?userId=${user.id}`);
        const result = await response.json();

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
  }, [user.id]);

  if (isLoading) {
    return (
      <Page className="flex items-center justify-center h-screen">
        <Text>Đang tải lịch đặt sân...</Text>
      </Page>
    );
  }

  if (!user.id) {
     return (
        <Page className="flex flex-col items-center justify-center h-screen p-4">
            <Text>Vui lòng quay lại trang chủ để đăng nhập.</Text>
            <Button onClick={() => navigate('/')} className="mt-4">Về trang chủ</Button>
        </Page>
     )
  }

  return (
    <Page className="p-4">
      <Text.Title className="text-2xl font-bold text-indigo-800 mb-6">Lịch đặt sân của tôi</Text.Title>
      {bookings.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <Text>Bạn chưa có đơn đặt sân nào.</Text>
        </div>
      ) : (
        <List>
          {bookings.map((booking) => (
            <div key={booking.booking_id} className="mb-8 bg-white shadow-md rounded-xl p-6">
              <Text.Title className="text-lg font-semibold mb-2">Mã đơn: {booking.booking_id}</Text.Title>
              <Text className="text-sm text-gray-600 mb-2">Ngày đặt: {dayjs(booking.created_at).format('DD/MM/YYYY HH:mm')}</Text>
              <Text className="text-sm text-gray-600 mb-4 font-medium">Tổng: {booking.totalPrice.toLocaleString('vi-VN')}đ</Text>
              <div className="mt-4">
                {booking.selectedSlots.map((slot, index) => (
                  <div key={index} className="mb-2">
                    <Text className="font-medium">{dayjs(slot.date).format('DD/MM/YYYY')} - {slot.time}</Text>
                    <Text className="text-sm text-gray-500">{slot.price.toLocaleString('vi-VN')}đ</Text>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </List>
      )}
      <div className="mt-8">
        <Button variant="secondary" fullWidth onClick={() => navigate('/')}>Quay về trang chủ</Button>
      </div>
    </Page>
  );
};

export default MyBookings;