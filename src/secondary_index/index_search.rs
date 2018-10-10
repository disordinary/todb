use std::fs::File;
use secondary_index;

/// Find the lowest element of `val` within the index file and returns an index number
/// keys = the index TODO CHANGE THIS TO IMPL SO IT"S SELF

//pub fn find_lowest<T>(keys: &mut File, val: T, low: usize, high: usize) -> Option<usize> {
//    let mut lowest:usize;
//    let mut lo = low;
//    let mut hi = high;
//    loop {
//        if hi == lo || hi + 1 == lo || hi - 1 == lo {
//            lowest = lo;
//            break;
//        }
//        let mid_point = lo + ((hi - lo) / 2);
//        let key = key_reader::read_key(keys,  mid_point);
//        let value:T = key.0; // todo convert to right format, some smarts here.
//
//        if value > val {
//            hi = mid_point;
//        } else {
//            lo = mid_point;
//        }
//    }
//
//    loop {
//        if lowest > 0 {
//            lowest = lowest - 1;
//            let key = key_reader::read_key(keys, lowest);
//            let value:T = key.0; // todo convert to right format, some smarts here.
//            if value < val {
//                break;
//            }
//        } else {
//            break;
//        }
//    }
//    Some(lowest)
//}
//
///// Find the highest element of `val` within the index file and returns an index number
//pub fn find_highest<T>(keys:&mut File, val: T, low: usize, high: usize) -> Option<usize> {
//    let initial_hi = high;
//    let mut highest:usize;
//    let mut lo = low;
//    let mut hi = high;
//
//    loop {
//        if hi == lo || hi + 1 == lo || hi - 1 == lo {
//            highest = lo;
//            break;
//        }
//        let mid_point = lo + ((hi - lo) / 2);
//        let key = key_reader::read_key(keys,  mid_point);
//        let value:T = key.0; // todo convert to right format, some smarts here.
//
//        if value > val {
//            hi = mid_point;
//        } else {
//            lo = mid_point;
//        }
//    }
//
//    loop {
//        if highest < initial_hi - 1 {
//            highest = highest + 1;
//            let key = key_reader::read_key(keys, highest);
//
//            let value:T = key.0; // todo convert to right format, some smarts here.
//            if value > val {
//                break;
//            }
//        } else {
//            break;
//        }
//    }
//    Some(highest)
//}

pub fn search(file: &secondary_index::IndexFile, key_type: &secondary_index::key_types, low: String, high: String) -> Vec<usize> {
    println!("Key type {:?} length {:?}", key_type, key_type.get_length());

    return vec![1;1];
}