import React, { useEffect, useRef } from 'react';
import { Page, List, Button, Text, Icon } from 'zmp-ui';
import { useNavigate } from 'zmp-ui';
import dayjs from 'dayjs';

import { showToast, Payment, events, EventName } from 'zmp-sdk/apis';

import { useAtom } from 'jotai';
import { selectedSlotsAtom } from '../store/cart';

interface Slot {
  id: number;
  time: string;
  available: boolean;
  price: number;
  date: string;
}

const SUCCESS_DATA_KEY = 'pes_success_data';
const SUCCESS_LOCK_KEY = 'pes_success_locked';
const FINAL_SLOTS_KEY = 'pes_final_slots';
const LAST_BOOKING_ID_KEY = 'last_booking_id';

const REDIRECT_PATH = '/payment-result';

const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [selectedSlots, setSelectedSlots] = useAtom(selectedSlotsAtom);
  const latestSelectedSlots = useRef(selectedSlots);

  useEffect(() => {
    latestSelectedSlots.current = selectedSlots;
  }, [selectedSlots]);

  useEffect(() => {
    localStorage.removeItem(FINAL_SLOTS_KEY);
    localStorage.removeItem(LAST_BOOKING_ID_KEY);
  }, []);

  // === MỚI: Hủy reserve cũ khi quay lại trang ===
  useEffect(() => {
    const cancelPreviousReserve = async () => {
      const userId = '3368637342326461234'; // Hardcode tạm - thay bằng Zalo SDK sau

      try {
        await fetch('https://pes-pickleball-backend.vercel.app/api/cancel-reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        console.log('Đã hủy giữ chỗ cũ khi quay lại trang');
      } catch (err) {
        console.error('Hủy reserve error:', err);
      }
    };

    cancelPreviousReserve();
  }, []); // Chỉ chạy khi mount

  const saveSuccessDataOnce = (successData: any) => {
    if (localStorage.getItem(SUCCESS_LOCK_KEY)) {
      console.log('Success data đã bị lock, bỏ qua overwrite');
      return;
    }
    localStorage.setItem(SUCCESS_DATA_KEY, JSON.stringify(successData));
    localStorage.setItem(SUCCESS_LOCK_KEY, 'true');
    console.log('Lưu successData lần đầu thành công:', successData);
    
    setTimeout(() => {
      localStorage.removeItem(SUCCESS_LOCK_KEY);
      localStorage.removeItem(SUCCESS_DATA_KEY);
      localStorage.removeItem(FINAL_SLOTS_KEY);
      localStorage.removeItem(LAST_BOOKING_ID_KEY);
    }, 600000);
  };

  const clearTempKeys = () => {
    localStorage.removeItem(SUCCESS_LOCK_KEY);
    localStorage.removeItem(SUCCESS_DATA_KEY);
    localStorage.removeItem(FINAL_SLOTS_KEY);
    localStorage.removeItem(LAST_BOOKING_ID_KEY);
    console.log('Đã xóa temp keys do fail/hủy thanh toán');
  };

  useEffect(() => {
    const handleOpenApp = (data: any) => {
      console.log('OpenApp event received:', data);
      const path = data?.path || '';

      if (path.includes(REDIRECT_PATH)) {
        console.log('Redirect path khớp, đang check transaction từ OpenApp...');

        Payment.checkTransaction({
          data: path,
          success: async (rs) => {
            console.log('checkTransaction from OpenApp success:', rs);

            if (rs.resultCode === 1 || rs.msg?.toLowerCase().includes('thành công')) {
              try {
                const userId = '3368637342326461234';
                const transId = rs.transId || rs.orderId || 'N/A';
                const bookingIdFromLocal = localStorage.getItem(LAST_BOOKING_ID_KEY) || '';

                showToast({ message: 'Thanh toán thành công! Đang lấy chi tiết đơn hàng...' });

                const response = await fetch(
                  `https://pes-pickleball-backend.vercel.app/api/get-booking?userId=${userId}&transId=${transId}&bookingId=${bookingIdFromLocal}`
                );
                const result = await response.json();

                let successData;

                if (result.success && result.booking) {
                  successData = {
                    bookingId: result.booking.booking_id,
                    totalPrice: result.booking.totalPrice,
                    selectedSlots: result.booking.selectedSlots,
                  };
                } else {
                  const storedFinal = localStorage.getItem(FINAL_SLOTS_KEY);
                  const finalSlots = storedFinal ? JSON.parse(storedFinal) : latestSelectedSlots.current;
                  
                  successData = {
                    bookingId: transId,
                    totalPrice: finalSlots.reduce((sum: number, slot: Slot) => sum + slot.price, 0),
                    selectedSlots: [...finalSlots],
                  };
                }

                showToast({ message: `Thanh toán thành công! Mã giao dịch: ${transId}` });
                
                saveSuccessDataOnce(successData);
                navigate('/success', { state: successData });
                setSelectedSlots([]);
                localStorage.removeItem(LAST_BOOKING_ID_KEY);
              } catch (err) {
                console.error('Fetch booking error after success:', err);
                showToast({ message: 'Lỗi lấy chi tiết đơn hàng từ server' });
                clearTempKeys();
              }
            } else if (rs.resultCode === 0) {
              showToast({ message: 'Giao dịch đang xử lý, vui lòng chờ...' });
              setTimeout(() => Payment.checkTransaction({ data: path }), 8000);
            } else {
              showToast({ message: `Thanh toán thất bại: ${rs.msg || 'Lỗi không xác định'}` });
              clearTempKeys();
            }
          },
          fail: (err) => {
            console.error('checkTransaction fail from OpenApp:', err);
            showToast({ message: 'Không thể kiểm tra trạng thái giao dịch' });
            clearTempKeys();
          }
        });
      }
    };

    const handlePaymentClose = (data: any) => {
      console.log('PaymentClose event received:', data);
      const resultCode = data?.resultCode;

      if (resultCode === 1) {
        showToast({ message: 'Thanh toán thành công (từ PaymentClose)' });
        
        const storedFinal = localStorage.getItem(FINAL_SLOTS_KEY);
        const finalSlots = storedFinal ? JSON.parse(storedFinal) : latestSelectedSlots.current;
        
        const successData = {
          transId: 'N/A (từ PaymentClose)',
          totalPrice: finalSlots.reduce((sum, slot) => sum + slot.price, 0),
          selectedSlots: [...finalSlots],
        };
        
        saveSuccessDataOnce(successData);
        
        navigate('/success', { state: successData });
        setSelectedSlots([]);
        localStorage.removeItem(FINAL_SLOTS_KEY);
      } else {
        showToast({ message: resultCode === 0 ? 'Giao dịch đang xử lý' : 'Thanh toán bị hủy hoặc thất bại' });
        clearTempKeys();
      }
    };

    events.on(EventName.OpenApp, handleOpenApp);
    events.on(EventName.PaymentClose, handlePaymentClose);

    return () => {
      events.off(EventName.OpenApp, handleOpenApp);
      events.off(EventName.PaymentClose, handlePaymentClose);
    };
  }, [navigate, setSelectedSlots]);

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

  const groupedByDate = selectedSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const totalSlots = selectedSlots.length;
  const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

  // === MỚI: Hủy reserve cũ khi remove slot ===
  const removeSlot = (removedSlot: Slot) => {
    const updatedSlots = selectedSlots.filter(s => !(s.id === removedSlot.id && s.date === removedSlot.date));
    setSelectedSlots(updatedSlots);
    showToast({ message: 'Đã bỏ slot!' });

    // Hủy reserve cũ khi chỉnh sửa
    const cancelPreviousReserve = async () => {
      const userId = '3368637342326461234';

      try {
        await fetch('https://pes-pickleball-backend.vercel.app/api/cancel-reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        console.log('Đã hủy giữ chỗ cũ khi remove slot');
      } catch (err) {
        console.error('Hủy reserve error:', err);
      }
    };

    cancelPreviousReserve();

    if (updatedSlots.length === 0) {
      showToast({ message: 'Giỏ hàng rỗng, quay về chọn lại!' });
      navigate(-1);
    }
  };

  // === MỚI: Hủy reserve cũ khi clear cart ===
  const clearCart = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ giỏ hàng?\nHành động này không thể hoàn tác.')) {
      setSelectedSlots([]);
      showToast({ message: 'Đã xóa toàn bộ giỏ hàng' });

      // Hủy reserve cũ khi clear
      const cancelPreviousReserve = async () => {
        const userId = '3368637342326461234';

        try {
          await fetch('https://pes-pickleball-backend.vercel.app/api/cancel-reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
          console.log('Đã hủy giữ chỗ cũ khi clear cart');
        } catch (err) {
          console.error('Hủy reserve error:', err);
        }
      };

      cancelPreviousReserve();

      navigate(-1);
    }
  };

  const handlePayment = async () => {
    try {
      const userId = '3368637342326461234'; // Hardcode tạm - thay bằng Zalo SDK sau
      const phone = '0901234567';
      const name = 'User Name';

      if (!userId) {
        showToast({ message: 'Vui lòng đăng nhập Zalo!' });
        return;
      }

      // === BƯỚC MỚI: Reserve slots trước thanh toán ===
      const reserveResponse = await fetch('https://pes-pickleball-backend.vercel.app/api/reserve-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          selectedSlots
        })
      });

      const reserveData = await reserveResponse.json();

      if (!reserveData.success) {
        showToast({ message: reserveData.error || 'Slot đã được đặt bởi người khác, vui lòng chọn lại!' });
        return; // Dừng flow thanh toán
      }

      // === LƯU bookingId từ reserve để dùng sau nếu cần (tùy chọn) ===
      if (reserveData.bookingId) {
        localStorage.setItem('temp_reserved_bookingId', reserveData.bookingId);
        console.log('Đã lưu temp_reserved_bookingId:', reserveData.bookingId);
      } else {
        console.warn('Không nhận được bookingId từ reserve API');
      }

      showToast({ message: 'Đã giữ chỗ thành công trong 15 phút! Đang chuyển thanh toán...' });

      // Lưu FINAL_SLOTS_KEY như cũ
      localStorage.removeItem(FINAL_SLOTS_KEY);
      localStorage.setItem(FINAL_SLOTS_KEY, JSON.stringify(selectedSlots));

      // Sinh orderId và gọi create-order
      const orderId = crypto.randomUUID();

      const response = await fetch('https://pes-pickleball-backend.vercel.app/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phone,
          name,
          selectedSlots,
          amount: totalPrice.toString(),
          desc: 'Đặt sân Pickleball',
          orderId
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Create order failed');

      const { mac, orderId: merchantOrderId } = data;

      localStorage.setItem(LAST_BOOKING_ID_KEY, merchantOrderId);

      Payment.createOrder({
        desc: 'Đặt sân Pickleball',
        item: selectedSlots.map(slot => ({
          id: slot.id.toString(),
          amount: slot.price
        })),
        amount: totalPrice.toString(),
        extradata: JSON.stringify({
          userId,
          phone,
          name,
          notes: 'Extra data from booking'
        }),
        method: JSON.stringify({
          id: "VNPAY_SANDBOX",
          isCustom: false
        }),
        mac,
        success: (res) => {
          showToast({ message: 'Tạo đơn hàng thành công! Đang chuyển thanh toán...' });
          console.log('SDK createOrder success:', res);

          const zaloOrderId = res.orderId;
          fetch('https://pes-pickleball-backend.vercel.app/api/update-zalo-orderid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: merchantOrderId, zaloOrderId })
          }).catch(err => console.error('Update zaloOrderId error:', err));
        },
        fail: (err) => {
          console.log('SDK createOrder fail:', err);
          showToast({ message: 'Tạo đơn hàng thất bại!' });
          clearTempKeys();
        }
      });
    } catch (err) {
      console.error('Payment error:', err);
      showToast({ message: 'Lỗi thanh toán, thử lại!' });
      clearTempKeys();
    }
  };

  return (
    <Page className="bg-gray-50 min-h-screen">
      <div className="p-4 pb-24">
        <Text.Title className="text-center text-2xl font-bold mb-6 text-blue-800">
          Xác nhận đặt sân Pickleball
        </Text.Title>

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

        <div className="flex justify-between items-center mb-4">
          <Text.Title className="font-bold text-lg text-gray-800">
            Các khung giờ đã chọn ({totalSlots} slot)
          </Text.Title>
          <Button
            color="red"
            variant="secondary"
            size="small"
            onClick={clearCart}
          >
            Xóa giỏ hàng
          </Button>
        </div>

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
                      <div className="flex items-center">
                        <Text className="font-medium text-green-600 mr-4">
                          {slot.price.toLocaleString('vi-VN')}đ
                        </Text>
                        <Button
                          variant="secondary"
                          size="small"
                          icon={<Icon icon="zi-close" />}
                          onClick={() => removeSlot(slot)}
                        >
                          Bỏ
                        </Button>
                      </div>
                    </div>
                  </List.Item>
                ))}
              </List>
            </div>
          ))}

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

        <Text className="text-sm text-gray-500 text-center mb-6">
          Vui lòng kiểm tra kỹ thông tin trước khi thanh toán. Hệ thống sẽ gửi mã xác nhận qua tin nhắn sau khi thanh toán thành công.
        </Text>
      </div>

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
          onClick={handlePayment}
          className="flex-1"
        >
          Xác nhận & Thanh toán
        </Button>
      </div>
    </Page>
  );
};

export default SummaryPage;