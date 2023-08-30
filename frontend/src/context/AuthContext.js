import React from 'react'
import { authReducer, initialState } from '../reducers/authReducer';
import { getTokensFromTokenUrl, getCurrentSession, setSignedInUserFromTokens } from '../libs/cognito';

export const AuthContext = React.createContext({
    state: initialState,
    dispatchEvent: () => initialState
});


export const AuthProvider = (props) => {
    const [state, dispatch] = React.useReducer(authReducer, initialState);

    const setUserFromToken = (tokens, loginCode) => {
        const user = setSignedInUserFromTokens(tokens)            
        dispatch({ type: 'LOGGED_IN_TOKENS', payload: { user, loginCode } });
        
        return Promise.resolve(user);
    }

    const setUserFromCode = (code, loginCode) => {
        return getTokensFromTokenUrl(code, loginCode)
            .then(tokens => setUserFromToken(tokens, loginCode))
            .catch(err => console.log(err));
    }

    const getUserSession = () => {
        return state.user && getCurrentSession(state.user)
    }

    return (<AuthContext.Provider value={{
        state, dispatch, setUserFromCode, setUserFromToken, getUserSession
    }}>{props.children}</AuthContext.Provider>);
};

export const useAuth = () => { 
    return React.useContext(AuthContext);
};
