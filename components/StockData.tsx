// components/StockData.tsx
export default function StockData() {
    const mockData = [
      { name: 'AI Index', value: '3034.25', change: '-2.43%', changeType: 'loss' },
      { name: 'Silver | Call 52.5', value: '1.338', change: '18.33%', changeType: 'gain' },
      { name: 'EUR/USD', value: '1.16232', change: '0.15%', changeType: 'gain' },
      { name: 'Gold', value: '4180.40', change: '0.91%', changeType: 'gain' },
      { name: 'Natural Gas', value: '3.010', change: '-0.53%', changeType: 'loss' },
      { name: 'Oil', value: '58.36', change: '-0.55%', changeType: 'loss' },
    ];
  
    return (
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            Most Popular Markets
          </h2>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <ul className="divide-y divide-gray-200">
              {mockData.map((item, index) => (
                <li key={index} className="flex items-center justify-between py-4">
                  <span className="text-lg font-medium text-gray-800">{item.name}</span>
                  <div className="flex items-center space-x-6">
                    <span className="text-lg text-gray-900">{item.value}</span>
                    <span className={`font-semibold ${item.changeType === 'gain' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.change}
                    </span>
                    <a href="#" className="px-5 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Trade
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }