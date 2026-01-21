import React, { useEffect, useState, useMemo } from 'react';
import { Page, Text, Icon, Box, Header, useNavigate, Button } from 'zmp-ui';
import dayjs from 'dayjs';
import 'dayjs/locale/vi'; 
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useAtomValue } from 'jotai';
import { userAtom } from '../store/cart';
import { showToast } from 'zmp-sdk/apis';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.locale('vi'); 

interface Slot {
  date: string;
  time: string;
  price: number;
}

interface Booking {
  booking_id: string;
  selectedSlots: Slot[];
  totalPrice: number | string;
  created_at: string;
  status: string; 
}

interface ScheduleSlot extends Slot {
  bookingId: string;
  status: string;
  createdAt: string;
}

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const user = useAtomValue(userAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user.id) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`https://pes-pickleball-backend.vercel.app/api/my-bookings?userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setBookings(data.bookings);
        }
      } catch (error) {
        console.error('Lỗi tải lịch sử:', error);
        showToast({ message: "Không thể tải lịch sử" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, [user.id]);

  const scheduleData = useMemo(() => {
    const allSlots: ScheduleSlot[] = [];
    bookings.forEach(booking => {
      if (booking.status === 'paid' || booking.status === 'success') {
        booking.selectedSlots.forEach(slot => {
          allSlots.push({
            ...slot,
            bookingId: booking.booking_id,
            status: booking.status,
            createdAt: booking.created_at
          });
        });
      }
    });

    allSlots.sort((a, b) => {
        const dateDiff = dayjs(a.date).diff(dayjs(b.date));
        if (dateDiff !== 0) return dateDiff;
        const hourA = parseInt(a.time.split('h')[0]);
        const hourB = parseInt(b.time.split('h')[0]);
        return hourA - hourB;
    });

    const grouped: { [key: string]: ScheduleSlot[] } = {};
    allSlots.forEach(slot => {
        if (!grouped[slot.date]) {
            grouped[slot.date] = [];
        }
        grouped[slot.date].push(slot);
    });

    return grouped;
  }, [bookings]);

  const sortedDates = Object.keys(scheduleData).sort((a, b) => dayjs(a).diff(dayjs(b)));
  const todayStr = dayjs().format('YYYY-MM-DD');

  // --- HÀM XỬ LÝ: CHUYỂN TRANG KÈM DỮ LIỆU ---
  const handleCheckIn = (slot: ScheduleSlot) => {
    navigate('/check-in', {
      state: {
        bookingId: slot.bookingId,
        slotInfo: slot, // Truyền toàn bộ thông tin slot sang trang CheckIn
        action: 'manual_checkin'
      }
    });
  };

  return (
    <Page className="bg-gray-50 h-screen flex flex-col">
      <Header title="Lịch Thi Đấu" showBackIcon={false} />

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center mt-10">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : sortedDates.length === 0 ? (
           <Box className="flex flex-col items-center justify-center mt-20 opacity-60">
             <Icon icon="zi-calendar" className="text-gray-400 text-5xl mb-4" />
             <Text className="text-gray-500">Bạn chưa có lịch đặt sân nào.</Text>
             <div className="mt-4 text-blue-600 font-medium cursor-pointer" onClick={() => navigate('/')}>
                + Đặt sân ngay
             </div>
           </Box>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
                const isToday = date === todayStr;
                const isPast = dayjs(date).isBefore(dayjs(), 'day');

                return (
                    <div key={date} className={`relative pl-4 ${isPast ? 'opacity-60 grayscale' : ''}`}>
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                        <div className="mb-3 relative">
                            <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isToday ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-gray-300'}`}></div>
                            <Text.Title className={`text-lg font-bold capitalize ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                                {dayjs(date).format('dddd, DD/MM')}
                                {isToday && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium normal-case">Hôm nay</span>}
                            </Text.Title>
                        </div>

                        <div className="space-y-3">
                            {scheduleData[date].map((slot, idx) => (
                                <div key={`${slot.bookingId}-${idx}`} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 w-14 h-14 rounded-lg flex flex-col items-center justify-center border border-blue-100">
                                            <span className="text-blue-700 font-bold text-lg leading-none">{slot.time.split('h')[0]}</span>
                                            <span className="text-xs text-blue-400 font-medium mt-0.5">:00</span>
                                        </div>
                                        <div>
                                            <Text className="font-semibold text-gray-700">Sân Thượng Đỉnh</Text>
                                            <Text className="text-xs text-gray-500">{slot.time}</Text>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        {!isPast ? (
                                            <Button 
                                                size="small" 
                                                className="h-8 text-xs font-semibold shadow-blue-200 shadow-md"
                                                onClick={() => handleCheckIn(slot)}
                                                prefixIcon={<Icon icon="zi-check-circle" size={12} />}
                                            >
                                                Check-in
                                            </Button>
                                        ) : (
                                            <div className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold inline-block">HOÀN THÀNH</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
          </div>
        )}
      </div>
      <div className="bg-white border-t p-3 sticky bottom-0 shadow-lg">
        <Button fullWidth onClick={() => navigate('/')}>Đặt lịch mới</Button>
      </div>
    </Page>
  );
};

export default MyBookings;