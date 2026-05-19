import { createContext, useContext, useState, useEffect } from 'react';

const LojaContext = createContext(null);

export function LojaProvider({ children }) {
    // Initialize from localStorage if available
    const [selectedLoja, setSelectedLoja] = useState(() => {
        return localStorage.getItem('selectedLoja') || '';
    });

    // Validar se a loja salva ainda é válida para o usuário poderia ser feito aqui ou no auth context
    // mas por simplicidade vamos apenas persistir.

    useEffect(() => {
        if (selectedLoja) {
            localStorage.setItem('selectedLoja', selectedLoja);
        } else {
            localStorage.removeItem('selectedLoja');
        }
    }, [selectedLoja]);

    return (
        <LojaContext.Provider value={{ selectedLoja, setSelectedLoja }}>
            {children}
        </LojaContext.Provider>
    );
}

export function useLoja() {
    const context = useContext(LojaContext);
    if (!context) {
        throw new Error('useLoja deve ser usado dentro de um LojaProvider');
    }
    return context;
}
