import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, CreditCard, ArrowRight } from 'lucide-react';
import { API_BASE } from '../api';

const MockPayment = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    
    const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'

    const handleSimulateSuccess = async () => {
        setStatus('processing');
        try {
            // Call our webhook internally to simulate Kaspi notification
            const response = await fetch(`${API_BASE}/kaspi/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: 'paid' })
            });

            if (response.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#f3f4f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{ 
                background: 'white', 
                padding: '40px', 
                borderRadius: '24px', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center'
            }}>
                <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    background: '#f14635', // Kaspi Red
                    borderRadius: '16px',
                    margin: '0 auto 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '24px'
                }}>
                    K
                </div>
                
                <h2 style={{ marginBottom: '8px' }}>Имитация Kaspi Pay</h2>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                    Заказ: <strong>{orderId}</strong><br/>
                    Сумма: <strong>{amount} ₸</strong>
                </p>

                {status === 'processing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button 
                            onClick={handleSimulateSuccess}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                background: '#f14635',
                                color: 'white',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            Подтвердить оплату (Demo)
                        </button>
                        <button 
                            onClick={() => setStatus('error')}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Отменить
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div>
                        <div style={{ color: '#059669', marginBottom: '16px' }}>
                            <CheckCircle size={64} style={{ margin: '0 auto' }} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Оплата прошла успешно!</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            Ваш тариф обновлен. Теперь вы можете использовать все возможности Pro.
                        </p>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                background: '#111827',
                                color: 'white',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            Вернуться в дашборд <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div style={{ color: '#dc2626', marginBottom: '16px' }}>
                            <XCircle size={64} style={{ margin: '0 auto' }} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Ошибка оплаты</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            Что-то пошло не так. Попробуйте еще раз.
                        </p>
                        <button 
                            onClick={() => setStatus('processing')}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                background: '#111827',
                                color: 'white',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Попробовать снова
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MockPayment;
