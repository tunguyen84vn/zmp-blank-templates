import React, { useState, useEffect } from 'react';
import { Page, Calendar, List, Button, Text, Checkbox } from 'zmp-ui';
import dayjs, { Dayjs } from 'dayjs';
import { showToast } from 'zmp-sdk/apis';  // Toast feedback

interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;  // Thêm date để phân biệt multi-day
}

// Custom Badge
const CustomBadge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ background: color, padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '12px' }}>
    {children}
  </span>
);

const HomePage = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);  // Lưu full slot object
  const [selectedDates, setSelectedDates] = useState<string[]>([]);  // Ngày đã chọn slot

  useEffect(() => {
    // Fetch lịch tất cả ngày từ backend
    fetch('https://pes-pickleball-backend.vercel.app/api/schedule')
      .then(res => res.json())
      .then(data => setAvailableDates(data.map((day: any) => day.date)))
      .catch(err => console.error('Fetch error:', err));
  }, []);

  const onSelect = (date: Date) => {
    setSelectedDate(dayjs(date));
    // Fetch slots cho ngày mới
    fetch(`https://pes-pickleball-backend.vercel.app/api/schedule-date?date=${dayjs(date).format('YYYY-MM-DD')}`)
      .then(res => res.json())
      .then(daySlots => {
        // Thêm date vào mỗi slot
        const slotsWithDate = daySlots.map((slot: any) => ({
          ...slot,
          date: dayjs(date).format('YYYY-MM-DD')
        }));
        setSlots(slotsWithDate);
      })
      .catch(err => console.error('Fetch error:', err));
  };

  const cellRender = (date: Date) => {
    const dayStr = dayjs(date).format('YYYY-MM-DD');
    const isAvailable = availableDates.includes(dayStr);
    const isSelected = selectedDates.includes(dayStr);  // Highlight ngày đã chọn slot

    return (
      <div style={{
        background: isSelected ? '#FF9800' : (isAvailable ? '#4CAF50' : '#f0f0f0'),  // Cam cho ngày đã chọn, xanh cho trống
        padding: '4px',
        borderRadius: '4px',
        fontWeight: isSelected ? 'bold' : 'normal'
      }}>
        {dayjs(date).date()}
        {isAvailable && <CustomBadge color="#4CAF50">Trống</CustomBadge>}
      </div>
    );
  };

  const disabledDate = (date: Date) => date < dayjs().toDate();

  const toggleSlot = (slot: Slot, checked: boolean) => {
    let newSelected = [...selectedSlots];
    if (checked) {
      newSelected.push(slot);
      // @ts-ignore  // Fix duration prop
      showToast({ message: 'Đã thêm slot', duration: 1500 });
    } else {
      newSelected = newSelected.filter(s => s.id !== slot.id || s.date !== slot.date);
      // @ts-ignore  // Fix duration prop
      showToast({ message: 'Đã xóa slot', duration: 1500 });
    }
    setSelectedSlots(newSelected);

    // Cập nhật selectedDates
    const datesWithSlots = newSelected.map(s => s.date);
    setSelectedDates([...new Set(datesWithSlots)]);  // Unique dates
  };

  const handleBook = () => {
    if (selectedSlots.length > 0) {
      const total = selectedSlots.reduce((sum, s) => sum + s.price, 0);
      alert(`Đặt ${selectedSlots.length} slot thành công! Tổng giá: ${total.toLocaleString()}đ`);
      setSelectedSlots([]);
      setSelectedDates([]); // Reset highlight
      // Sau gọi VNPay backend
    }
  };

  const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);

  return (
    <Page className="flex flex-col p-4 space-y-4 bg-white dark:bg-black">
      <Text.Header className="text-center text-xl font-bold">Đặt Sân Pickleball (24/24)</Text.Header>
      <Text className="text-center text-gray-500">Chọn nhiều slot từ nhiều ngày</Text>
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
              ) : (
                <CustomBadge color="#f5222d">Bận</CustomBadge>
              )}
            </div>
          </List.Item>
        ))}
        {slots.length === 0 && <Text className="text-center text-gray-500">Không có giờ trống</Text>}
      </List>
      {selectedSlots.length > 0 && (
        <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg">
          <Button color="primary" onClick={handleBook} className="w-full">
            Thanh toán {selectedSlots.length} slot ({totalPrice.toLocaleString()}đ)
          </Button>
        </div>
      )}
    </Page>
  );
};

export default HomePage;