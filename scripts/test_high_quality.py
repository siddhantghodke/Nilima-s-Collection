import os
from pathlib import Path
from PIL import Image
from rembg import remove, new_session

# Paths
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = WORKSPACE_DIR / "Images"
OUTPUT_DIR = WORKSPACE_DIR / "public" / "uploads" / "products" / "test_renders"

def test_render():
    OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
    
    # Use one of the restored images
    test_img_path = IMAGES_DIR / "IMG-20230702-WA0150.jpg"
    if not test_img_path.exists():
        print(f"Error: {test_img_path} not found.")
        return

    print(f"Loading test image: {test_img_path.name}")
    input_image = Image.open(test_img_path)

    # 1. Default u2net
    print("Processing with default u2net...")
    out_default = remove(input_image)
    out_default.save(OUTPUT_DIR / "u2net_default.png")
    print(" - Saved u2net_default.png")

    # 2. u2net with Alpha Matting
    print("Processing with u2net + alpha matting...")
    out_matting = remove(
        input_image, 
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10
    )
    out_matting.save(OUTPUT_DIR / "u2net_matting.png")
    print(" - Saved u2net_matting.png")

    # 3. isnet-general-use with Alpha Matting
    print("Processing with isnet-general-use + alpha matting...")
    try:
        session = new_session("isnet-general-use")
        out_isnet = remove(
            input_image, 
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10
        )
        out_isnet.save(OUTPUT_DIR / "isnet_matting.png")
        print(" - Saved isnet_matting.png")
    except Exception as e:
        print(f" - Failed to process with isnet: {e}")

    print("\nTest rendering complete. Outputs saved in public/uploads/products/test_renders/")

if __name__ == "__main__":
    test_render()
