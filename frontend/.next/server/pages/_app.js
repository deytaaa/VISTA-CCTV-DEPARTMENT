/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./context/AuthContext.js":
/*!********************************!*\
  !*** ./context/AuthContext.js ***!
  \********************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider),\n/* harmony export */   useAuth: () => (/* binding */ useAuth)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/supabaseClient */ \"./lib/supabaseClient.js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_lib_supabaseClient__WEBPACK_IMPORTED_MODULE_2__]);\n_lib_supabaseClient__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nconst AuthContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(null);\nfunction AuthProvider({ children }) {\n    const [session, setSession] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{\n        let mounted = true;\n        async function loadSession() {\n            const { data, error } = await _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_2__.supabase.auth.getSession();\n            if (!mounted) return;\n            if (error) {\n                console.error(\"Failed to load auth session\", error);\n            }\n            setSession(data?.session ?? null);\n            setLoading(false);\n        }\n        loadSession();\n        const { data: subscription } = _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_2__.supabase.auth.onAuthStateChange((_event, nextSession)=>{\n            setSession(nextSession);\n            setLoading(false);\n        });\n        return ()=>{\n            mounted = false;\n            subscription?.subscription?.unsubscribe?.();\n        };\n    }, []);\n    const value = (0,react__WEBPACK_IMPORTED_MODULE_1__.useMemo)(()=>({\n            session,\n            user: session?.user ?? null,\n            loading,\n            isAuthenticated: Boolean(session)\n        }), [\n        loading,\n        session\n    ]);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(AuthContext.Provider, {\n        value: value,\n        children: children\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\mrdat\\\\OneDrive\\\\Desktop\\\\VISTA CCTV DEPARTMENT\\\\frontend\\\\context\\\\AuthContext.js\",\n        lineNumber: 49,\n        columnNumber: 10\n    }, this);\n}\nfunction useAuth() {\n    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthContext);\n    if (!context) {\n        throw new Error(\"useAuth must be used inside AuthProvider\");\n    }\n    return context;\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9jb250ZXh0L0F1dGhDb250ZXh0LmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQStFO0FBQy9CO0FBRWhELE1BQU1NLDRCQUFjTixvREFBYUEsQ0FBQztBQUUzQixTQUFTTyxhQUFhLEVBQUVDLFFBQVEsRUFBRTtJQUN2QyxNQUFNLENBQUNDLFNBQVNDLFdBQVcsR0FBR04sK0NBQVFBLENBQUM7SUFDdkMsTUFBTSxDQUFDTyxTQUFTQyxXQUFXLEdBQUdSLCtDQUFRQSxDQUFDO0lBRXZDRixnREFBU0EsQ0FBQztRQUNSLElBQUlXLFVBQVU7UUFFZCxlQUFlQztZQUNiLE1BQU0sRUFBRUMsSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNWCx5REFBUUEsQ0FBQ1ksSUFBSSxDQUFDQyxVQUFVO1lBRXRELElBQUksQ0FBQ0wsU0FBUztZQUVkLElBQUlHLE9BQU87Z0JBQ1RHLFFBQVFILEtBQUssQ0FBQywrQkFBK0JBO1lBQy9DO1lBRUFOLFdBQVdLLE1BQU1OLFdBQVc7WUFDNUJHLFdBQVc7UUFDYjtRQUVBRTtRQUVBLE1BQU0sRUFBRUMsTUFBTUssWUFBWSxFQUFFLEdBQUdmLHlEQUFRQSxDQUFDWSxJQUFJLENBQUNJLGlCQUFpQixDQUFDLENBQUNDLFFBQVFDO1lBQ3RFYixXQUFXYTtZQUNYWCxXQUFXO1FBQ2I7UUFFQSxPQUFPO1lBQ0xDLFVBQVU7WUFDVk8sY0FBY0EsY0FBY0k7UUFDOUI7SUFDRixHQUFHLEVBQUU7SUFFTCxNQUFNQyxRQUFRdEIsOENBQU9BLENBQ25CLElBQU87WUFDTE07WUFDQWlCLE1BQU1qQixTQUFTaUIsUUFBUTtZQUN2QmY7WUFDQWdCLGlCQUFpQkMsUUFBUW5CO1FBQzNCLElBQ0E7UUFBQ0U7UUFBU0Y7S0FBUTtJQUdwQixxQkFBTyw4REFBQ0gsWUFBWXVCLFFBQVE7UUFBQ0osT0FBT0E7a0JBQVFqQjs7Ozs7O0FBQzlDO0FBRU8sU0FBU3NCO0lBQ2QsTUFBTUMsVUFBVTlCLGlEQUFVQSxDQUFDSztJQUUzQixJQUFJLENBQUN5QixTQUFTO1FBQ1osTUFBTSxJQUFJQyxNQUFNO0lBQ2xCO0lBRUEsT0FBT0Q7QUFDVCIsInNvdXJjZXMiOlsid2VicGFjazovL3Zpc3RhLWNjdHYtZnJvbnRlbmQvLi9jb250ZXh0L0F1dGhDb250ZXh0LmpzPzEzOTgiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCwgdXNlRWZmZWN0LCB1c2VNZW1vLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0J1xyXG5pbXBvcnQgeyBzdXBhYmFzZSB9IGZyb20gJy4uL2xpYi9zdXBhYmFzZUNsaWVudCdcclxuXHJcbmNvbnN0IEF1dGhDb250ZXh0ID0gY3JlYXRlQ29udGV4dChudWxsKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIEF1dGhQcm92aWRlcih7IGNoaWxkcmVuIH0pIHtcclxuICBjb25zdCBbc2Vzc2lvbiwgc2V0U2Vzc2lvbl0gPSB1c2VTdGF0ZShudWxsKVxyXG4gIGNvbnN0IFtsb2FkaW5nLCBzZXRMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpXHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBsZXQgbW91bnRlZCA9IHRydWVcclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkU2Vzc2lvbigpIHtcclxuICAgICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRTZXNzaW9uKClcclxuXHJcbiAgICAgIGlmICghbW91bnRlZCkgcmV0dXJuXHJcblxyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gbG9hZCBhdXRoIHNlc3Npb24nLCBlcnJvcilcclxuICAgICAgfVxyXG5cclxuICAgICAgc2V0U2Vzc2lvbihkYXRhPy5zZXNzaW9uID8/IG51bGwpXHJcbiAgICAgIHNldExvYWRpbmcoZmFsc2UpXHJcbiAgICB9XHJcblxyXG4gICAgbG9hZFNlc3Npb24oKVxyXG5cclxuICAgIGNvbnN0IHsgZGF0YTogc3Vic2NyaXB0aW9uIH0gPSBzdXBhYmFzZS5hdXRoLm9uQXV0aFN0YXRlQ2hhbmdlKChfZXZlbnQsIG5leHRTZXNzaW9uKSA9PiB7XHJcbiAgICAgIHNldFNlc3Npb24obmV4dFNlc3Npb24pXHJcbiAgICAgIHNldExvYWRpbmcoZmFsc2UpXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgIG1vdW50ZWQgPSBmYWxzZVxyXG4gICAgICBzdWJzY3JpcHRpb24/LnN1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmU/LigpXHJcbiAgICB9XHJcbiAgfSwgW10pXHJcblxyXG4gIGNvbnN0IHZhbHVlID0gdXNlTWVtbyhcclxuICAgICgpID0+ICh7XHJcbiAgICAgIHNlc3Npb24sXHJcbiAgICAgIHVzZXI6IHNlc3Npb24/LnVzZXIgPz8gbnVsbCxcclxuICAgICAgbG9hZGluZyxcclxuICAgICAgaXNBdXRoZW50aWNhdGVkOiBCb29sZWFuKHNlc3Npb24pLFxyXG4gICAgfSksXHJcbiAgICBbbG9hZGluZywgc2Vzc2lvbl1cclxuICApXHJcblxyXG4gIHJldHVybiA8QXV0aENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3ZhbHVlfT57Y2hpbGRyZW59PC9BdXRoQ29udGV4dC5Qcm92aWRlcj5cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVzZUF1dGgoKSB7XHJcbiAgY29uc3QgY29udGV4dCA9IHVzZUNvbnRleHQoQXV0aENvbnRleHQpXHJcblxyXG4gIGlmICghY29udGV4dCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCd1c2VBdXRoIG11c3QgYmUgdXNlZCBpbnNpZGUgQXV0aFByb3ZpZGVyJylcclxuICB9XHJcblxyXG4gIHJldHVybiBjb250ZXh0XHJcbn1cclxuIl0sIm5hbWVzIjpbImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwidXNlRWZmZWN0IiwidXNlTWVtbyIsInVzZVN0YXRlIiwic3VwYWJhc2UiLCJBdXRoQ29udGV4dCIsIkF1dGhQcm92aWRlciIsImNoaWxkcmVuIiwic2Vzc2lvbiIsInNldFNlc3Npb24iLCJsb2FkaW5nIiwic2V0TG9hZGluZyIsIm1vdW50ZWQiLCJsb2FkU2Vzc2lvbiIsImRhdGEiLCJlcnJvciIsImF1dGgiLCJnZXRTZXNzaW9uIiwiY29uc29sZSIsInN1YnNjcmlwdGlvbiIsIm9uQXV0aFN0YXRlQ2hhbmdlIiwiX2V2ZW50IiwibmV4dFNlc3Npb24iLCJ1bnN1YnNjcmliZSIsInZhbHVlIiwidXNlciIsImlzQXV0aGVudGljYXRlZCIsIkJvb2xlYW4iLCJQcm92aWRlciIsInVzZUF1dGgiLCJjb250ZXh0IiwiRXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./context/AuthContext.js\n");

/***/ }),

/***/ "./lib/supabaseClient.js":
/*!*******************************!*\
  !*** ./lib/supabaseClient.js ***!
  \*******************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   signInWithEmail: () => (/* binding */ signInWithEmail),\n/* harmony export */   signOut: () => (/* binding */ signOut),\n/* harmony export */   supabase: () => (/* binding */ supabase)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"@supabase/supabase-js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__]);\n_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\nconst SUPABASE_URL = \"https://nbpzqftxfnnwfothdcvj.supabase.co\";\nconst SUPABASE_ANON_KEY = \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icHpxZnR4Zm5ud2ZvdGhkY3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDc1NDQsImV4cCI6MjA5NTAyMzU0NH0.finayTmwyI7RJg2Fs74agFfw6Px4TV298XMdbLX0V_I\";\nif (!SUPABASE_URL || !SUPABASE_ANON_KEY) {\n    console.warn(\"Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY\");\n}\nconst supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);\nasync function signInWithEmail(email, password) {\n    return supabase.auth.signInWithPassword({\n        email,\n        password\n    });\n}\nasync function signOut() {\n    return supabase.auth.signOut();\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9saWIvc3VwYWJhc2VDbGllbnQuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFvRDtBQUVwRCxNQUFNQyxlQUFlQywwQ0FBb0M7QUFDekQsTUFBTUcsb0JBQW9CSCxrTkFBeUM7QUFFbkUsSUFBSSxDQUFDRCxnQkFBZ0IsQ0FBQ0ksbUJBQW1CO0lBQ3hDRSxRQUFRQyxJQUFJLENBQUM7QUFDZDtBQUVPLE1BQU1DLFdBQVdULG1FQUFZQSxDQUFDQyxjQUFjSSxtQkFBbUI7QUFFL0QsZUFBZUssZ0JBQWdCQyxLQUFLLEVBQUVDLFFBQVE7SUFDcEQsT0FBT0gsU0FBU0ksSUFBSSxDQUFDQyxrQkFBa0IsQ0FBQztRQUFFSDtRQUFPQztJQUFTO0FBQzNEO0FBRU8sZUFBZUc7SUFDckIsT0FBT04sU0FBU0ksSUFBSSxDQUFDRSxPQUFPO0FBQzdCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdmlzdGEtY2N0di1mcm9udGVuZC8uL2xpYi9zdXBhYmFzZUNsaWVudC5qcz81ZjBkIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcydcclxuXHJcbmNvbnN0IFNVUEFCQVNFX1VSTCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTDtcclxuY29uc3QgU1VQQUJBU0VfQU5PTl9LRVkgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9BTk9OX0tFWTtcclxuXHJcbmlmICghU1VQQUJBU0VfVVJMIHx8ICFTVVBBQkFTRV9BTk9OX0tFWSkge1xyXG5cdGNvbnNvbGUud2FybignTWlzc2luZyBORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwgb3IgTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVknKTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlQ2xpZW50KFNVUEFCQVNFX1VSTCwgU1VQQUJBU0VfQU5PTl9LRVkpO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25JbldpdGhFbWFpbChlbWFpbCwgcGFzc3dvcmQpIHtcclxuXHRyZXR1cm4gc3VwYWJhc2UuYXV0aC5zaWduSW5XaXRoUGFzc3dvcmQoeyBlbWFpbCwgcGFzc3dvcmQgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaWduT3V0KCkge1xyXG5cdHJldHVybiBzdXBhYmFzZS5hdXRoLnNpZ25PdXQoKTtcclxufVxyXG4iXSwibmFtZXMiOlsiY3JlYXRlQ2xpZW50IiwiU1VQQUJBU0VfVVJMIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsIlNVUEFCQVNFX0FOT05fS0VZIiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkiLCJjb25zb2xlIiwid2FybiIsInN1cGFiYXNlIiwic2lnbkluV2l0aEVtYWlsIiwiZW1haWwiLCJwYXNzd29yZCIsImF1dGgiLCJzaWduSW5XaXRoUGFzc3dvcmQiLCJzaWduT3V0Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./lib/supabaseClient.js\n");

/***/ }),

/***/ "./pages/_app.js":
/*!***********************!*\
  !*** ./pages/_app.js ***!
  \***********************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _context_AuthContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context/AuthContext */ \"./context/AuthContext.js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_context_AuthContext__WEBPACK_IMPORTED_MODULE_2__]);\n_context_AuthContext__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_context_AuthContext__WEBPACK_IMPORTED_MODULE_2__.AuthProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"C:\\\\Users\\\\mrdat\\\\OneDrive\\\\Desktop\\\\VISTA CCTV DEPARTMENT\\\\frontend\\\\pages\\\\_app.js\",\n            lineNumber: 7,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\mrdat\\\\OneDrive\\\\Desktop\\\\VISTA CCTV DEPARTMENT\\\\frontend\\\\pages\\\\_app.js\",\n        lineNumber: 6,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBOEI7QUFDdUI7QUFFdEMsU0FBU0MsSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBRTtJQUNsRCxxQkFDRSw4REFBQ0gsOERBQVlBO2tCQUNYLDRFQUFDRTtZQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0FBRzlCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdmlzdGEtY2N0di1mcm9udGVuZC8uL3BhZ2VzL19hcHAuanM/ZTBhZCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uL3N0eWxlcy9nbG9iYWxzLmNzcydcclxuaW1wb3J0IHsgQXV0aFByb3ZpZGVyIH0gZnJvbSAnLi4vY29udGV4dC9BdXRoQ29udGV4dCdcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH0pIHtcclxuICByZXR1cm4gKFxyXG4gICAgPEF1dGhQcm92aWRlcj5cclxuICAgICAgPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPlxyXG4gICAgPC9BdXRoUHJvdmlkZXI+XHJcbiAgKVxyXG59XHJcbiJdLCJuYW1lcyI6WyJBdXRoUHJvdmlkZXIiLCJBcHAiLCJDb21wb25lbnQiLCJwYWdlUHJvcHMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./pages/_app.js\n");

/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "@supabase/supabase-js":
/*!****************************************!*\
  !*** external "@supabase/supabase-js" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = import("@supabase/supabase-js");;

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("./pages/_app.js"));
module.exports = __webpack_exports__;

})();