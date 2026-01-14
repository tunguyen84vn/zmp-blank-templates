import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Page, Calendar, List, Button, Text, Checkbox, Spinner, useNavigate } from 'zmp-ui';
import dayjs, { Dayjs } from 'dayjs';
import { showToast, getUserInfo } from 'zmp-sdk/apis'; // Import getUserInfo
import _debounce from 'lodash/debounce';

// Import Jotai
import { useAtom, useSetAtom } from 'jotai';
import { selectedSlotsAtom, userAtom, Slot } from '../store/cart'; 

// Custom Badge
const CustomBadge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ background: color, padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '12px' }}>
    {children}
  </span>
);

const HomePage = () => {
  const navigate = useNavigate();
  const setUser = useSetAtom(userAtom); // Hook để lưu user vào store
  
  // State quản lý lịch
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlots, setSelectedSlots] = useAtom(selectedSlotsAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slotsCache, setSlotsCache] = useState<{ [date: string]: Slot[] }>({});
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs()); // Cần cho logic panel change
  
  // === 1. SILENT LOGIN: Lấy User ID & Debug ===
  useEffect(() => {
    console.log('App mounting... Calling getUserInfo');
    
    getUserInfo({
      success: (data) => {
        const { userInfo } = data;
        console.log('✅ Silent Login Success:', userInfo);
        
        // Lưu vào Store
        setUser({
          id: userInfo.id,
          name: userInfo.name,
          avatar: userInfo.avatar
        });

        // Gọi API hủy reserve cũ
        fetch('https://pes-pickleball-backend.vercel.app/api/cancel-reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userInfo.id })
        })
        .then(() => console.log('✅ Cancel previous reserve success'))
        .catch(err => console.error('❌ Cancel reserve failed:', err));
      },
      fail: (error) => {
        console.error('❌ Silent Login Failed:', error);
        // Không chặn App, cho phép xem lịch nhưng sẽ chặn ở bước thanh toán sau
      }
    });
  }, [setUser]);

  // === 2. Logic Calendar (Đã khôi phục) ===
  const onSelect = useCallback(
    _debounce((date: Date) => {
      if (loading) return;
      const newDate = dayjs(date);
      setSelectedDate(newDate);
      setLoading(true);
      setError('');
      const newDateStr = newDate.format('YYYY-MM-DD');

      if (slotsCache[newDateStr]) {
        setSlots(slotsCache[newDateStr]);
        setLoading(false);
        return;
      }

      fetch(`https://pes-pickleball-backend.vercel.app/api/schedule-date?date=${newDateStr}`)
        .then(res => res.json())
        .then(daySlots => {
          const slotsWithDate = daySlots.map((slot: any) => ({ ...slot, date: newDateStr }));
          setSlots(slotsWithDate);
          setSlotsCache(prev => ({ ...prev, [newDateStr]: slotsWithDate }));
          setLoading(false);
        })
        .catch(err => {
          setError('Lỗi tải slots giờ');
          setLoading(false);
        });
    }, 500),
    [slotsCache, loading]
  );

  // Helper: Kiểm tra tháng có hợp lệ không (trong vòng 90 ngày)
  const isMonthSelectable = (month: Dayjs) => {
    const today = dayjs();
    const endDate = today.add(90, 'day');
    const startOfMonth = month.startOf('month');
    const endOfMonth = month.endOf('month');
    return startOfMonth.isBefore(endDate) && endOfMonth.isAfter(today);
  };

  // Helper: Xử lý khi người dùng vuốt đổi tháng
  const handlePanelChange = (date: Date) => {
    const newMonth = dayjs(date);
    if (!isMonthSelectable(newMonth)) {
      showToast({ message: 'Không có slot ngoài phạm vi!' });
      return;
    }

    setCurrentMonth(newMonth);
    let targetDate = newMonth.startOf('month');

    // Tự động tìm ngày hợp lệ đầu tiên của tháng mới nếu ngày mùng 1 bị disable
    if (disabledDate(targetDate.toDate())) {
      targetDate = targetDate.add(1, 'day');
      while (disabledDate(targetDate.toDate()) && targetDate.isSame(newMonth, 'month')) {
        targetDate = targetDate.add(1, 'day');
      }
    }

    if (!targetDate.isSame(selectedDate, 'day')) {
      setSelectedDate(targetDate);
      // Gọi onSelect để load slot cho ngày mới
      onSelect(targetDate.toDate());
    }
  };

  const cellRender = (date: Date) => {
    const currentDate = dayjs();
    const selectedDay = dayjs(date);
    const dayStr = selectedDay.format('YYYY-MM-DD');
    const hasSelected = selectedSlots.some(s => s.date === dayStr);

    if (selectedDay.isBefore(currentDate, 'day') || selectedDay.isAfter(currentDate.add(3, 'month'), 'day')) {
      return <div style={{ padding: '4px', borderRadius: '4px' }}>{selectedDay.date()}</div>;
    }
    const background = hasSelected ? '#FF9800' : '#4CAF50';
    return (
      <div style={{ background, padding: '4px', borderRadius: '4px', fontWeight: hasSelected ? 'bold' : 'normal', position: 'relative' }}>
        {selectedDay.date()}
        {hasSelected && <span style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '8px', color: '#FF9800' }}>●</span>}
      </div>
    );
  };

  const disabledDate = (current: Date) => {
    const today = dayjs();
    return dayjs(current).isBefore(today, 'day') || dayjs(current).isAfter(today.add(90, 'day'), 'day');
  };

  const toggleSlot = useCallback((slot: Slot, checked: boolean) => {
    setSelectedSlots(prev => {
      if (checked) return [...prev, slot];
      return prev.filter(s => s.id !== slot.id || s.date !== slot.date);
    });
    showToast({ message: checked ? 'Đã thêm slot' : 'Đã xóa slot' });
  }, [setSelectedSlots]);

  const totalPrice = useMemo(() => selectedSlots.reduce((sum, s) => sum + s.price, 0), [selectedSlots]);

  const handleBook = () => {
    if (selectedSlots.length > 0) {
      navigate('/summary', { state: { selectedSlots } });
    }
  };

  return (
    <Page className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Text.Header className="text-center text-xl font-bold">Đặt Sân Pickleball (24/24)</Text.Header>
        <Text className="text-center text-gray-500">Chọn nhiều slot từ nhiều ngày</Text>
        
        <Calendar
          value={selectedDate.toDate()}
          cellRender={cellRender}
          onSelect={onSelect}
          disabledDate={disabledDate}
          fullscreen={true}
          onPanelChange={handlePanelChange} // <-- Đã thêm lại prop này
          style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        />
        
        <Text className="text-center text-lg font-semibold">Giờ trống ngày {selectedDate.format('DD/MM/YYYY')}</Text>
        {error && <Text className="text-center text-red-500">{error}</Text>}
        {loading ? (
          <div className="flex justify-center items-center h-32"><Spinner /></div>
        ) : (
          <List className="rounded-lg overflow-hidden">
            {slots.map(slot => (
              <List.Item key={`${slot.id}-${slot.date}`} className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <Checkbox
                    value={`${slot.id}-${slot.date}`}
                    checked={selectedSlots.some(s => s.id === slot.id && s.date === slot.date)}
                    onChange={(e) => toggleSlot(slot, e.target.checked)}
                    disabled={!slot.available}
                  />
                  <p className="text-lg">{slot.time} (1 tiếng)</p>
                  {slot.available ? (
                    <p className="text-green-500">{slot.price.toLocaleString()}đ</p>
                  ) : <CustomBadge color="#f5222d">Bận</CustomBadge>}
                </div>
              </List.Item>
            ))}
            {slots.length === 0 && !loading && <Text className="text-center text-gray-500">Không có giờ trống</Text>}
          </List>
        )}
      </div>

      <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg">
        <Button variant="secondary" fullWidth onClick={() => navigate('/my-bookings')}>
          Xem lịch đặt sân của tôi
        </Button>
        <Button color="primary" onClick={handleBook} disabled={selectedSlots.length === 0} className="w-full mt-2">
          {selectedSlots.length === 0 ? 'Chọn slot để đặt sân' : `Đặt sân ${selectedSlots.length} slot (${totalPrice.toLocaleString()}đ)`}
        </Button>
      </div>
    </Page>
  );
};

export default HomePage;