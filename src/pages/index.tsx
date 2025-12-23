import React, { useState, useEffect } from 'react';
import { Page, Calendar, List, Button, Text, Checkbox } from 'zmp-ui';
import dayjs, { Dayjs } from 'dayjs';
import { getUserInfo } from 'zmp-sdk/apis';  // Named imports

interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
}

// Custom Badge (thay zmp-ui Badge để tránh lỗi export – style đơn giản)
const CustomBadge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ background: color, padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '12px' }}>
    {children}
  </span>
);

const HomePage = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Fetch lịch tất cả ngày từ backend
    fetch('https://pes-pickleball-backend.vercel.app/api/schedule')
      .then(res => res.json())
      .then(data => setAvailableDates(data.map((day: any) => day.date)))
      .catch(err => console.error('Fetch error:', err));
  }, []);


  const onSelect = (date: Date) => {
    setSelectedDate(dayjs(date));
    setSelectedSlots([]); // Reset chọn
    // Fetch slots ngày từ backend
    fetch(`https://pes-pickleball-backend.vercel.app/api/schedule-date?date=${dayjs(date).format('YYYY-MM-DD')}`)
      .then(res => res.json())
      .then(daySlots => setSlots(daySlots))
      .catch(err => console.error('Fetch error:', err));
  };

  const cellRender = (date: Date) => {
    const dayStr = dayjs(date).format('YYYY-MM-DD');
    const isAvailable = availableDates.includes(dayStr);
    return (
      <div style={{ background: isAvailable ? '#4CAF50' : '#f0f0f0', padding: '4px', borderRadius: '4px' }}>
        {dayjs(date).date()}
        {isAvailable && <CustomBadge color="#4CAF50">Trống</CustomBadge>}
      </div>
    );
  };

  const disabledDate = (date: Date) => date < dayjs().toDate();

  const toggleSlot = (slotId: number, checked: boolean) => {
    if (checked) {
      setSelectedSlots([...selectedSlots, slotId]);
    } else {
      setSelectedSlots(selectedSlots.filter(id => id !== slotId));
    }
  };

  const handleBook = () => {
    if (selectedSlots.length > 0) {
      const chosen = slots.filter(s => selectedSlots.includes(s.id));
      const total = chosen.reduce((sum, s) => sum + s.price, 0);
      alert(`Đặt ${selectedSlots.length} slot thành công! Tổng giá: ${total.toLocaleString()}đ`);
      setSelectedSlots([]); // Reset giỏ
      // Sau gọi VNPay backend
    }
  };

  return (
    <Page className="flex flex-col p-4 space-y-4 bg-white dark:bg-black">
      <Text.Header className="text-center text-xl font-bold">Đặt Sân Pickleball (24/24)</Text.Header>
      <Text className="text-center text-gray-500">Chọn ngày để xem giờ trống</Text>
      <Calendar
        value={selectedDate.toDate()}
        cellRender={cellRender}
        onSelect={onSelect}
        disabledDate={disabledDate}
        fullscreen={true}
        style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      />
      <Text className="text-center text-lg font-semibold">Giờ trống ngày {selectedDate.format('DD/MM/YYYY')}</Text>
      <List className="rounded-lg overflow-hidden">
        {slots.map(slot => (
          <List.Item key={slot.id} className="p-4 border-b">
            <div className="flex justify-between items-center">
              <Checkbox
                value={slot.id.toString()}  // Fix prop 'value'
                checked={selectedSlots.includes(slot.id)}
                onChange={(e) => toggleSlot(slot.id, e.target.checked)}
                disabled={!slot.available}
              />
              <p className="text-lg">{slot.time} (1 tiếng)</p>
              {slot.available ? (
                <p className="text-green-500">{slot.price.toLocaleString()}đ</p>
              ) : (
                <CustomBadge color="#f5222d">Bận</CustomBadge>
              )}
            </div>
          </List.Item>
        ))}
        {slots.length === 0 && <Text className="text-center text-gray-500">Không có giờ trống</Text>}
      </List>
      {selectedSlots.length > 0 && (
        <Button color="primary" onClick={handleBook} className="mt-4">
          Thanh toán {selectedSlots.length} slot ({slots.filter(s => selectedSlots.includes(s.id)).reduce((sum, s) => sum + s.price, 0).toLocaleString()}đ)
        </Button>
      )}

    </Page>
  );
};

export default HomePage;