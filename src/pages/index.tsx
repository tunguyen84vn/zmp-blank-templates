import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Page, Calendar, List, Button, Text, Checkbox, Spinner } from 'zmp-ui';
import dayjs, { Dayjs } from 'dayjs';
import { showToast } from 'zmp-sdk/apis';
import _debounce from 'lodash/debounce'; // yarn add lodash

interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
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
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slotsCache, setSlotsCache] = useState<{ [date: string]: Slot[] }>({}); // Cache per date

  useEffect(() => {
    const cachedDates = localStorage.getItem('availableDates');
    if (cachedDates) {
      setAvailableDates(JSON.parse(cachedDates));
    } else {
      setLoading(true);
      fetch('https://pes-pickleball-backend.vercel.app/api/schedule')
        .then(res => res.json())
        .then(data => {
          const dates = data.map((day: any) => day.date);
          setAvailableDates(dates);
          localStorage.setItem('availableDates', JSON.stringify(dates));
          setLoading(false);
        })
        .catch(err => {
          setError('Lỗi tải lịch ngày');
          setLoading(false);
        });
    }
  }, []);

  const debouncedOnSelect = useCallback(
    _debounce((date: Date) => {
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
          const slotsWithDate = daySlots.map((slot: any) => ({
            ...slot,
            date: newDateStr
          }));
          setSlots(slotsWithDate);
          setSlotsCache(prev => ({ ...prev, [newDateStr]: slotsWithDate }));
          setLoading(false);
        })
        .catch(err => {
          setError('Lỗi tải slots giờ');
          setLoading(false);
        });
    }, 300), // Delay 300ms to avoid rapid clicks
    [slotsCache]
  );

  const onSelect = (date: Date) => {
    debouncedOnSelect(date);
  };

  const cellRender = (date: Date) => {
    const dayStr = dayjs(date).format('YYYY-MM-DD');
    const isAvailable = availableDates.includes(dayStr);
    const hasSelected = selectedSlots.some(s => s.date === dayStr);

    let background = '#f0f0f0';
    if (hasSelected) background = '#FF9800'; // Orange for selected day
    else if (isAvailable) background = '#4CAF50'; // Green for available

    return (
      <div style={{
        background,
        padding: '4px',
        borderRadius: '4px',
        fontWeight: hasSelected ? 'bold' : 'normal',
        position: 'relative'
      }}>
        {dayjs(date).date()}
        {isAvailable && <span style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '8px', color: '#4CAF50' }}>●</span>}
        {hasSelected && <span style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '8px', color: '#FF9800' }}>●</span>}
      </div>
    );
  };

  const disabledDate = (date: Date) => date < dayjs().toDate();

  const toggleSlot = useCallback((slot: Slot, checked: boolean) => {
    setSelectedSlots(prev => {
      if (checked) {
        return [...prev, slot];
      } else {
        return prev.filter(s => s.id !== slot.id || s.date !== slot.date);
      }
    });
    // @ts-ignore
    showToast({ message: checked ? 'Đã thêm slot' : 'Đã xóa slot', duration: 1500 });
  }, []);

  const totalPrice = useMemo(() => {
    return selectedSlots.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSlots]);

  const handleBook = () => {
    if (selectedSlots.length > 0) {
      alert(`Đặt ${selectedSlots.length} slot thành công! Tổng giá: ${totalPrice.toLocaleString()}đ`);
      setSelectedSlots([]); // Reset giỏ
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
          style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        />
        <Text className="text-center text-lg font-semibold">Giờ trống ngày {selectedDate.format('DD/MM/YYYY')}</Text>
        {error && <Text className="text-center text-red-500">{error}</Text>}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Spinner />
          </div>
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
                  ) : (
                    <CustomBadge color="#f5222d">Bận</CustomBadge>
                  )}
                </div>
              </List.Item>
            ))}
            {slots.length === 0 && <Text className="text-center text-gray-500">Không có giờ trống</Text>}
          </List>
        )}
      </div>

      {/* Fixed Thanh toán button */}
      <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg">
        <Button color="primary" onClick={handleBook} disabled={selectedSlots.length === 0} className="w-full">
          {selectedSlots.length === 0 
            ? 'Chọn slot để thanh toán' 
            : `Thanh toán ${selectedSlots.length} slot (${totalPrice.toLocaleString()}đ)`}
        </Button>
      </div>
    </Page>
  );
};

export default HomePage;