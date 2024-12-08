import './styleTable.css';

export default function TableData({cols, data}) {

  return (
    <div className='border border-slate-200 rounded p-1'>
      <table>
        <thead>
          <tr>
            {
              cols.map(col => (<th scope="col">{col.label}</th>))
            }
          </tr>
        </thead>
            {
              data.map(row => {
                return (
                  <tr>
                    {
                      cols.map(col => {
                        return (
                          <td data-label={col.label}>{row[col.col]}</td>
                        )
                      })
                    }
                  </tr>
                )
              })
            }
      </table>
    </div>
  )
}
