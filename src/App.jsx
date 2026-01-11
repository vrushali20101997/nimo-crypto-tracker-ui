import { useState, useEffect } from 'react';

// Configuration - .env is managing api key
const API_BASE = import.meta.env.VITE_API_BASE;
const API_KEY = import.meta.env.VITE_API_KEY;
const REQUEST_TIMEOUT = 30000;

function App() {
  const [cryptocurrency, setCryptocurrency] = useState('bitcoin');
  const [email, setEmail] = useState('vrushaliyadav92@outlook.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const cryptos = [
    { id: 'bitcoin', name: 'Bitcoin (BTC)' },
    { id: 'ethereum', name: 'Ethereum (ETH)' },
    { id: 'solana', name: 'Solana (SOL)' },
    { id: 'cardano', name: 'Cardano (ADA)' },
    { id: 'dogecoin', name: 'Dogecoin (DOGE)' },
    { id: 'ripple', name: 'Ripple (XRP)' },
    { id: 'polkadot', name: 'Polkadot (DOT)' },
    { id: 'litecoin', name: 'Litecoin (LTC)' },
    { id: 'chainlink', name: 'Chainlink (LINK)' },
    { id: 'stellar', name: 'Stellar (XLM)' },
  ];

  // RFC 5322 compliant email validation
  const validateEmail = (emailValue) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailValue || emailValue.trim().length === 0) {
      return 'Email is required';
    }
    if (!emailRegex.test(emailValue.trim())) {
      return 'Invalid email format';
    }
    if (emailValue.trim().length > 254) {
      return 'Email address is too long';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  // Loading initial history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  
   // Fetching crypto price and triggering mail notification
   //Response - cached by backend for 60 seconds
   
  const fetchPrice = async () => {
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setEmailError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE}/crypto/price`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ 
          cryptocurrency: cryptocurrency.trim(), 
          email: email.trim() 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid response from server');
      }

      if (response.ok) {
        if (data.success) {
          setResult(data.data);
          if (data.warning) {
            setError(data.warning);
          }
          // Refresh history after successful price fetch
          setTimeout(() => fetchHistory(), 1500);
        } else {
          setError(data.error || 'Request failed');
        }
      } else {
        // Map HTTP status codes to user-friendly messages
        const errorMsg = data.error || `Request failed with status ${response.status}`;
        
        if (response.status === 400) {
          setError(`Validation Error: ${errorMsg}`);
        } else if (response.status === 403) {
          setError('Invalid API key. Please check your configuration.');
        } else if (response.status === 429) {
          setError('Rate limit exceeded. Please try again later.');
        } else if (response.status === 503) {
          setError('Service temporarily unavailable. Please try again.');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  
  // Retrieving  search history using DynamoDB GSI
   // Avoiding table scans through indexed queries
   
  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE}/crypto/history`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'X-API-Key': API_KEY
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid response from server');
      }
      
      if (response.ok && data.success) {
        setHistory(data.data || []);
      } else {
        const errorMsg = data.error || 'Failed to load history';
        if (response.status === 403) {
          setHistoryError('Invalid API key. Please check your configuration.');
        } else if (response.status === 503) {
          setHistoryError('Service temporarily unavailable.');
        } else {
          setHistoryError(errorMsg);
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        setHistoryError('Request timeout.');
      } else if (err.message.includes('Failed to fetch')) {
        setHistoryError('Network error.');
      } else {
        setHistoryError(err.message || 'Failed to load history');
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      fetchPrice();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-white mb-1">
            Nimo Crypto Tracker
          </h1>
          <p className="text-slate-400 text-sm">
            Real-time cryptocurrency prices with caching and rate limiting
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-6">
            Get Crypto Price
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Cryptocurrency
              </label>
              <select
                value={cryptocurrency}
                onChange={(e) => setCryptocurrency(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cryptos.map(crypto => (
                  <option key={crypto.id} value={crypto.id}>
                    {crypto.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
                placeholder="your-email@example.com"
              />
              {emailError && (
                <p className="mt-2 text-sm text-red-400">
                  {emailError}
                </p>
              )}
            </div>

            <button
              onClick={fetchPrice}
              disabled={loading || !!emailError}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Fetching Price...' : 'Get Price & Send Email'}
            </button>
          </div>

          {result && (
            <div className="mt-6 bg-green-900/20 border border-green-800 p-4 rounded-lg">
              <h3 className="font-semibold text-green-400 mb-3">
                Price Retrieved Successfully
              </h3>
              <div className="space-y-2">
                <p className="text-white text-lg capitalize">
                  {result.cryptocurrency}
                </p>
                <p className="text-3xl font-bold text-white">
                  ${typeof result.price === 'number' ? result.price.toLocaleString() : '0'}
                </p>
                <p className={`text-sm font-medium ${
                  result.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.change24h >= 0 ? '↑' : '↓'} {
                    typeof result.change24h === 'number' 
                      ? result.change24h.toFixed(2) 
                      : '0.00'
                  }% (24h)
                </p>
                <p className="text-slate-400 text-sm mt-3">
                  Email sent to <strong className="text-white">{email}</strong>
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Response cached for 60 seconds
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-900/20 border border-red-800 p-4 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">
                Error Occurred
              </h3>
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Search History
              </h2>
            </div>
            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {historyLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {historyError && (
            <div className="mb-4 bg-yellow-900/20 border border-yellow-800 p-3 rounded-lg">
              <p className="text-yellow-400 text-sm">{historyError}</p>
            </div>
          )}

          {history.length === 0 && !historyLoading && !historyError ? (
            <div className="text-center py-12 bg-slate-700/30 rounded-lg">
              <p className="text-slate-400 text-lg font-medium">No history yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Search for a cryptocurrency to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Cryptocurrency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Price (USD)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      24h Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {history.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 text-sm font-medium text-white capitalize">
                        {item.cryptocurrency || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">
                        ${typeof item.price === 'number' ? item.price.toLocaleString() : '0'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${
                        item.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {item.change24h >= 0 ? '↑' : '↓'} {
                          typeof item.change24h === 'number' 
                            ? item.change24h.toFixed(2) 
                            : '0.00'
                        }%
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {item.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-slate-500 text-sm">
          <p className="mb-1">Built with React + AWS Serverless</p>
          <p className="text-xs">Lambda • API Gateway • DynamoDB • SES</p>
        </div>

      </div>
    </div>
  );
}

export default App;