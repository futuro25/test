import * as React from 'react';
import {SyncLoader, ClipLoader} from 'react-spinners';

export default function Spinner() {
    return <div className='flex items-center justify-center mt-20'><ClipLoader /></div>;
  };