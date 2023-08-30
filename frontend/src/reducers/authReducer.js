
export const initialState = { 
    user: null, 
    refreshToken: null, 
    idToken: null, 
    accessToken: null,
    loginCode: null,
    error: null,
    ...(localStorage.getItem('authState') ? JSON.parse(localStorage.getItem('authState')) : {} )
};

export function authReducer(state, action) { 
    let newState;  
    switch (action.type) {
        case 'LOGGED_IN_TOKENS': { 
            const { user, loginCode } = action.payload;
            newState = ({
                ...state, 
                error: null,
                user, 
                refreshToken: user.signInUserSession.refreshToken.token,
                idToken: user.signInUserSession.idToken.jwtToken,
                accessToken: user.signInUserSession.accessToken.jwtToken,
                loginCode,
                fullName: `${user.signInUserSession.idToken.payload.given_name} ${user.signInUserSession.idToken.payload.family_name}`
            });
            break;
        }
        case 'LOGGED_IN_ERROR': { 
            newState = ({
                ...initialState,
                error: action.payload.error
            });
            break;
        }
        default: { 
            newState = state;
            break;
        }
    }

    localStorage.setItem('authState', JSON.stringify(newState));
    return newState;
}