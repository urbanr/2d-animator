import unittest
from downscale_sprites import RgbaImage
from pack_pose_trial_sheet import pack


class PackPoseSheetTest(unittest.TestCase):
    def test_non_divisible_width_and_pixel_preservation(self):
        w,h=158,80
        pixels=bytearray(bytes((80,80,80,255))*w*h)
        points=[]
        for i in range(8):
            x=round((i%4+.5)*w/4)
            y=i//4*40+10+i
            pixels[(y*w+x)*4:(y*w+x)*4+4]=bytes((255,0,i,255))
            points.append((x,y))
        # First sprite crosses the nominal first-column boundary.
        for x in range(30,43):
            pixels[(20*w+x)*4:(20*w+x)*4+4]=bytes((255,0,0,255))
        out,record=pack(RgbaImage(w,h,bytes(pixels)),64)
        self.assertGreater(record['column_cuts'][1],43)
        self.assertFalse(record['resampled'])
        for i,(x,y) in enumerate(points):
            rect=record['placements'][i]['source_rect']
            dest=record['placements'][i]['destination_in_cell']
            xx=i%4*64+dest[0]+x-rect[0]
            yy=i//4*64+dest[1]+y-rect[1]
            self.assertEqual(out.pixels[(yy*out.width+xx)*4:(yy*out.width+xx)*4+4],bytes((255,0,i,255)))

    def test_no_gutter_rejected(self):
        with self.assertRaisesRegex(ValueError,'No safe gutter'):
            pack(RgbaImage(160,80,bytes((255,0,0,255))*160*80),64)


if __name__=='__main__':
    unittest.main()
