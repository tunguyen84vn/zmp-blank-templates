import React from 'react';
import { Page, List, Button, Text } from 'zmp-ui';
import { useAtom } from 'jotai';
import { cartAtom } from '../../state/cart';  // Import cart state
import { useNavigate } from 'react-router-dom';  // For navigation back

const CartPage = () => {
  const [cart, setCart] = useAtom(cartAtom);
  const navigate = useNavigate();

  const total = cart.reduce((sum, s) => sum + s.price, 0);

  const handlePayment = () => {
    // Call VNPay backend to create order
    fetch('https://pes-pickleball-backend.vercel.app/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: total, description: 'Đặt slot sân', items: cart })
    }).then(res => res.json()).then(data => {
      window.location.href = data.paymentUrl;  // Redirect to VNPay
    });
    setCart([]); // Clear cart after payment
  };

  return (
    <Page>
      <Text.Header className="text-center text-xl font-bold">Giỏ Slot Đặt</Text.Header>
      <List>
        {cart.map(slot => (
          <List.Item key={slot.id} title={slot.time} suffix={`${slot.price.toLocaleString()}đ`} />
        ))}
        {cart.length === 0 && <Text className="text-center text-gray-500">Giỏ rỗng</Text>}
      </List>
      {cart.length > 0 && (
        <div className="p-4">
          <Text className="text-right text-lg">Tổng: {total.toLocaleString()}đ</Text>
          <Button color="primary" onClick={handlePayment} className="mt-2">
            Thanh toán
          </Button>
        </div>
      )}
      <Button color="secondary" onClick={() => navigate('/')} className="mt-4">
        Quay về Lịch
      </Button>
    </Page>
  );
};

export default CartPage;