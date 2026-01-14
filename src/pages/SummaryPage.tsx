import React, { useEffect, useRef } from 'react';
import { Page, List, Button, Text, Icon } from 'zmp-ui';
import { useNavigate } from 'zmp-ui';
import dayjs from 'dayjs';

// Import thêm getUserInfo, getPhoneNumber, getAccessToken từ SDK
import { 
  showToast, 
  Payment, 
  events, 
  EventName, 
  getPhoneNumber, 
  getAccessToken, 
  getUserInfo 
} from 'zmp-sdk/apis';

import { useAtom } from 'jotai';
import { selectedSlotsAtom, userAtom, Slot } from '../store/cart';

const SUCCESS_DATA_KEY = 'pes_success_data';
const SUCCESS_LOCK_KEY = 'pes_success_locked';
const FINAL_SLOTS_KEY = 'pes_final_slots';
const LAST_BOOKING_ID_KEY = 'last_booking_id';
const REDIRECT_PATH = '/payment-result';

const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [selectedSlots, setSelectedSlots] = useAtom(selectedSlotsAtom);
  // Thêm state user từ Jotai
  const [user, setUser] = useAtom(userAtom); 
  
  const latestSelectedSlots = useRef(selectedSlots);

  useEffect(() => {
    latestSelectedSlots.current = selectedSlots;
  }, [selectedSlots]);

  useEffect(() => {
    // Logic gốc: Xóa key temp khi vào trang
    localStorage.removeItem(FINAL_SLOTS_KEY);
    localStorage.removeItem(LAST_BOOKING_ID_KEY);
  }, []);

  // === MỚI: Hàm hủy reserve cũ (được tách ra để gọi ở nhiều chỗ) ===
  // Logic này cần thiết để đồng bộ với backend như bạn yêu cầu
  const cancelPreviousReserve = async (userIdToCheck: string) => {
    if (!userIdToCheck) return;
    try {
      await fetch('https://pes-pickleball-backend.vercel.app/api/cancel-reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdToCheck })
      });
      console.log('Đã hủy giữ chỗ cũ');
    } catch (err) {
      console.error('Hủy reserve error:', err);
    }
  };

  // Effect: Gọi hủy reserve khi component mount (nếu đã có user)
  useEffect(() => {
    if (user.id) {
        cancelPreviousReserve(user.id);
    }
  }, [user.id]);

  // === Logic gốc: Xử lý lưu Success Data ===
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

  // === Logic gốc: Sự kiện OpenApp và PaymentClose (GIỮ NGUYÊN) ===
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
                // Fallback user id nếu state bị mất (để gọi API get-booking)
                const currentUserId = user.id || 'unknown_user';
                const transId = rs.transId || rs.orderId || 'N/A';
                const bookingIdFromLocal = localStorage.getItem(LAST_BOOKING_ID_KEY) || '';

                showToast({ message: 'Thanh toán thành công! Đang lấy chi tiết đơn hàng...' });

                const response = await fetch(
                  `https://pes-pickleball-backend.vercel.app/api/get-booking?userId=${currentUserId}&transId=${transId}&bookingId=${bookingIdFromLocal}`
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
          totalPrice: finalSlots.reduce((sum: number, slot: Slot) => sum + slot.price, 0),
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
  }, [navigate, setSelectedSlots, user.id]);

  // === Logic Remove Slot & Clear Cart ===
  const removeSlot = (removedSlot: Slot) => {
    const updatedSlots = selectedSlots.filter(s => !(s.id === removedSlot.id && s.date === removedSlot.date));
    setSelectedSlots(updatedSlots);
    showToast({ message: 'Đã bỏ slot!' });
    
    // Gọi hủy reserve cũ
    if (user.id) cancelPreviousReserve(user.id);

    if (updatedSlots.length === 0) {
      showToast({ message: 'Giỏ hàng rỗng, quay về chọn lại!' });
      navigate(-1);
    }
  };

  const clearCart = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ giỏ hàng?\nHành động này không thể hoàn tác.')) {
      setSelectedSlots([]);
      showToast({ message: 'Đã xóa toàn bộ giỏ hàng' });
      
      // Gọi hủy reserve cũ
      if (user.id) cancelPreviousReserve(user.id);

      navigate(-1);
    }
  };

  // === LOGIC THANH TOÁN (Thay đổi chính nằm ở đây) ===
  const handlePayment = async () => {
    try {
      // --- BƯỚC 1: Lấy thông tin User (FALLBACK nếu mất state) ---
      let currentUserId = user.id;
      let currentUserName = user.name;
      
      // Nếu không có ID trong store (do refresh), gọi SDK lấy lại ngay
      if (!currentUserId) {
        console.log('⚠️ State User bị mất, đang gọi getUserInfo để khôi phục...');
        try {
            const userInfo: any = await new Promise((resolve, reject) => {
                getUserInfo({
                    success: (data) => resolve(data.userInfo),
                    fail: (err) => reject(err)
                });
            });
            
            // Cập nhật lại biến cục bộ và store
            currentUserId = userInfo.id;
            currentUserName = userInfo.name;
            setUser(prev => ({ 
                ...prev, 
                id: userInfo.id, 
                name: userInfo.name, 
                avatar: userInfo.avatar 
            }));
            console.log('✅ Đã khôi phục User ID:', currentUserId);
        } catch (e) {
            console.error('Không thể lấy thông tin user:', e);
            showToast({ message: 'Lỗi xác thực người dùng. Vui lòng thử lại!' });
            return;
        }
      }

      // --- BƯỚC 2: Reserve Slots (Giữ chỗ) ---
      // Logic này giữ nguyên như bạn đã đồng ý
      const reserveResponse = await fetch('https://pes-pickleball-backend.vercel.app/api/reserve-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          selectedSlots
        })
      });

      const reserveData = await reserveResponse.json();

      if (!reserveData.success) {
        showToast({ message: reserveData.error || 'Slot đã được đặt bởi người khác, vui lòng chọn lại!' });
        return; 
      }

      if (reserveData.bookingId) {
        localStorage.setItem('temp_reserved_bookingId', reserveData.bookingId);
      }

      showToast({ message: 'Đã giữ chỗ thành công! Đang xử lý thông tin...' });

      // --- BƯỚC 3: Xin quyền số điện thoại (MỚI) ---
      // Chỉ xin khi chưa có số điện thoại
      let currentPhone = user.phone;

      if (!currentPhone) {
        try {
            // Hiện popup Zalo xin quyền
            const { token: phoneToken } = await getPhoneNumber({});
            // Lấy access token
            const accessToken = await getAccessToken({});

            // Gọi Backend đổi token -> số thật
            const updateRes = await fetch('https://pes-pickleball-backend.vercel.app/api/update-phone', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'access_token': accessToken
                },
                body: JSON.stringify({ userId: currentUserId, token: phoneToken })
            });

            const phoneData = await updateRes.json();
            if (!phoneData.success) throw new Error('Lỗi cập nhật số điện thoại');
            
            currentPhone = phoneData.phone;
            
            // Cập nhật vào Store
            setUser(prev => ({ ...prev, phone: currentPhone }));
            console.log('Đã cập nhật số điện thoại:', currentPhone);

        } catch (err) {
            console.error('Lỗi xin quyền sđt:', err);
            showToast({ message: 'Cần số điện thoại để đặt sân!' });
            return;
        }
      }

      // --- BƯỚC 4: Tạo đơn hàng (Create Order) ---
      localStorage.removeItem(FINAL_SLOTS_KEY);
      localStorage.setItem(FINAL_SLOTS_KEY, JSON.stringify(selectedSlots));

      const orderId = crypto.randomUUID();
      const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);

      const response = await fetch('https://pes-pickleball-backend.vercel.app/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId, // Dùng ID chắc chắn có
          phone: currentPhone,
          name: currentUserName,
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

      // --- BƯỚC 5: Gọi SDK Payment (GIỮ NGUYÊN) ---
      Payment.createOrder({
        desc: 'Đặt sân Pickleball',
        item: selectedSlots.map(slot => ({
          id: slot.id.toString(),
          amount: slot.price
        })),
        amount: totalPrice.toString(),
        extradata: JSON.stringify({
          userId: currentUserId,
          phone: currentPhone,
          name: currentUserName,
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

  // === Logic Render UI (GIỮ NGUYÊN 100%) ===
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

  return (
    <Page className="bg-gray-50 min-h-screen">
      <div className="p-4 pb-24">
        <Text.Title className="text-center text-2xl font-bold mb-6 text-blue-800">
          Xác nhận đặt sân Pickleball
        </Text.Title>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center mb-3">
            <Icon icon="zi-location-solid" className="text-blue-600 mr-3 text-2xl" />
            <Text.Title className="text-lg font-semibold">PES Pickleball</Text.Title>
          </div>
          <Text className="text-gray-700 mb-2">
            Địa chỉ: số 239 Đường Nguyễn Trãi, Phường Tân Ninh, Tây Ninh
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